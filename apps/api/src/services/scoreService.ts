import { prisma } from '@driverhub/database'
import { computeDriverScore } from '@driverhub/ai'
import { writeAudit } from '../lib/audit.js'

/**
 * Persisting driver score (spec §18). Transparent rules live in @driverhub/ai/score.
 * Score changes are audit-logged (spec §67 SCORE_CHANGED).
 */
export async function computeAndSaveScore(userId: string): Promise<{ id?: string; userId: string; score: number; components: unknown }> {
  const now = new Date()
  const since30 = new Date(now.getTime() - 30 * 86_400_000)
  const since180 = new Date(now.getTime() - 180 * 86_400_000)

  const [income, expenses, sessions, carCount, goalCnt, activeGoals, scoreEvents, achievements, referrals, challengeJoins, clubClaims] =
    await Promise.all([
      prisma.incomeRecord.findMany({ where: { userId, deletedAt: null }, select: { amount: true, date: true, tripCount: true } }),
      prisma.expenseRecord.findMany({ where: { userId, deletedAt: null }, select: { amount: true, date: true, category: true } }),
      prisma.workSession.findMany({ where: { userId }, select: { startedAt: true, endedAt: true } }),
      prisma.car.count({ where: { userId, deletedAt: null } }),
      prisma.goal.count({ where: { userId, deletedAt: null, status: 'COMPLETED' } }),
      prisma.goal.findMany({ where: { userId, deletedAt: null, status: 'ACTIVE' }, select: { id: true, targetAmount: true } }),
      prisma.driverScoreEvent.count({ where: { userId } }),
      prisma.driverAchievement.count({ where: { userId } }),
      prisma.referral.count({ where: { referrerId: userId, status: { in: ['ACTIVE', 'REWARDED'] } } }),
      prisma.challengeParticipant.count({ where: { userId } }),
      prisma.offerClaim.count({ where: { userId } }),
    ])

  const activeGoalIds = activeGoals.map((g) => g.id)
  const goalTransfers = activeGoalIds.length
    ? await prisma.goalTransaction.groupBy({
        by: ['goalId'],
        where: { goalId: { in: activeGoalIds } },
        _sum: { amount: true },
      })
    : []
  const goalProgress =
    activeGoalIds.length === 0
      ? 0
      : activeGoals.reduce((acc, g, i) => {
          const saved = goalTransfers.find((t) => t.goalId === g.id)?._sum.amount ?? 0
          const pct = g.targetAmount > 0 ? saved / g.targetAmount : 0
          return acc + pct / activeGoals.length
        }, 0)

  const maintenance30 = await prisma.maintenanceRecord.count({ where: { userId, date: { gte: since30 } } })
  const maintenance180 = await prisma.maintenanceRecord.count({ where: { userId, date: { gte: since180 } } })

  const customerRating = null // only set from verified platform feedback in future
  void scoreEvents

  const result = computeDriverScore({
    income,
    expenses,
    sessions: sessions as { startedAt: Date; endedAt?: Date | null }[],
    hasCar: carCount > 0,
    maintenanceEvents30d: maintenance30,
    maintenanceEvents180d: maintenance180,
    completedGoals: goalCnt,
    activeGoals: activeGoalIds.length,
    goalProgress,
    achievementsCount: achievements,
    referralsActive: referrals,
    challengesJoined: challengeJoins,
    clubClaims,
    customerRating,
  })

  await prisma.driverScore.upsert({
    where: { userId },
    create: { userId, score: result.score, components: result.components as object, computedAt: now },
    update: { score: result.score, components: result.components as object, computedAt: now },
  })

  await writeAudit({ actorId: userId, actorRole: 'DRIVER', action: 'SCORE_CHANGED', targetType: 'driver', metadata: { score: result.score } })

  return { userId, score: result.score, components: result.components }
}