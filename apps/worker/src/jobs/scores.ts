import { prisma } from '@driverhub/database'
import { computeDriverScore } from '@driverhub/ai'
import type { JobHandlers } from '../queue.js'

/**
 * Driver score recompute (spec §18, M7). Canonical rules live in
 * @driverhub/ai/score.ts. This mirrors apps/api/src/services/scoreService.ts
 * (kept separate so each process stays self-contained — no cross-app imports).
 * Runs for drivers with any activity in the last 30 days only.
 */

export function scoreJobHandlers(): JobHandlers {
  return {
    calculate_driver_score: async () => {
      const now = new Date()
      const since30 = new Date(now.getTime() - 30 * 86_400_000)
      const since180 = new Date(now.getTime() - 180 * 86_400_000)

      // Drivers with any income/expense activity in the last 30 days.
      // `income`/`expenses` live on User, not Driver — so collect recent userIds
      // from the record tables directly, then filter to drivers still active.
      const [recentIncome, recentExpenses] = await Promise.all([
        prisma.incomeRecord.findMany({
          where: { deletedAt: null, date: { gte: since30 } },
          select: { userId: true },
        }),
        prisma.expenseRecord.findMany({
          where: { deletedAt: null, date: { gte: since30 } },
          select: { userId: true },
        }),
      ])
      const activeIds = [...new Set([...recentIncome.map((r) => r.userId), ...recentExpenses.map((r) => r.userId)])]

      const activeDrivers = await prisma.driver.findMany({
        where: { userId: { in: activeIds }, user: { deletedAt: null, isBanned: false, isSuspended: false } },
        select: { userId: true },
      })

      if (activeDrivers.length === 0) {
        console.log('[worker] calculate_driver_score: faol haydovchi topilmadi (no-op)')
        return
      }

      let updated = 0
      for (const { userId } of activeDrivers) {
        const [income, expenses, sessions, carCount, completedGoals, activeGoals, achievements, referrals, challengeJoins, clubClaims] =
          await Promise.all([
            prisma.incomeRecord.findMany({ where: { userId, deletedAt: null }, select: { amount: true, date: true, tripCount: true } }),
            prisma.expenseRecord.findMany({ where: { userId, deletedAt: null }, select: { amount: true, date: true, category: true } }),
            prisma.workSession.findMany({ where: { userId }, select: { startedAt: true, endedAt: true } }),
            prisma.car.count({ where: { userId, deletedAt: null } }),
            prisma.goal.count({ where: { userId, deletedAt: null, status: 'COMPLETED' } }),
            prisma.goal.findMany({ where: { userId, deletedAt: null, status: 'ACTIVE' }, select: { id: true, targetAmount: true } }),
            prisma.driverAchievement.count({ where: { userId } }),
            prisma.referral.count({ where: { referrerId: userId, status: { in: ['ACTIVE', 'REWARDED'] } } }),
            prisma.challengeParticipant.count({ where: { userId } }),
            prisma.offerClaim.count({ where: { userId } }),
          ])

        const maintenance30 = await prisma.maintenanceRecord.count({ where: { userId, date: { gte: since30 } } })
        const maintenance180 = await prisma.maintenanceRecord.count({ where: { userId, date: { gte: since180 } } })

        const activeGoalIds = activeGoals.map((g) => g.id)
        const goalTransfers = activeGoalIds.length
          ? await prisma.goalTransaction.groupBy({ by: ['goalId'], where: { goalId: { in: activeGoalIds } }, _sum: { amount: true } })
          : []
        const goalProgress =
          activeGoalIds.length === 0
            ? 0
            : activeGoals.reduce((acc, g, i) => {
                const saved = goalTransfers.find((t) => t.goalId === g.id)?._sum.amount ?? 0
                return acc + (g.targetAmount > 0 ? saved / g.targetAmount : 0) / activeGoals.length
              }, 0)

        const result = computeDriverScore({
          income,
          expenses,
          sessions: sessions as { startedAt: Date; endedAt?: Date | null }[],
          hasCar: carCount > 0,
          maintenanceEvents30d: maintenance30,
          maintenanceEvents180d: maintenance180,
          completedGoals,
          activeGoals: activeGoalIds.length,
          goalProgress,
          achievementsCount: achievements,
          referralsActive: referrals,
          challengesJoined: challengeJoins,
          clubClaims,
          customerRating: null,
        })

        await prisma.driverScore.upsert({
          where: { userId },
          create: { userId, score: result.score, components: result.components as object, computedAt: now },
          update: { score: result.score, components: result.components as object, computedAt: now },
        })
        updated++
      }
      console.log(`[worker] calculate_driver_score: ${updated} ta haydovchi yangilandi`)
    },
    // analytics are computed on demand (no analytics table) — refreshing scores
    // is the honest equivalent; kept as a named job for the BullMQ worker list.
    update_analytics: async () => {
      const h = scoreJobHandlers().calculate_driver_score
      await h?.({})
    },
  }
}