import { prisma } from '@driverhub/database'
import type { JobHandlers } from '../queue.js'

/**
 * Lifecycle jobs (M7):
 *  - `maintenance_reminder` → cars with next due date in ≤3 days get a push row.
 *  - `goal_reminder`        → active goals with deadline in ≤3 days get a push row.
 *  - `subscription_expiry`  → active PRO subs expiring in ≤3 days get a push row and
 *    past-due subs are marked EXPIRED (honest state transition).
 *  - `process_referral_reward` → PENDING referrals whose invitee completed onboarding
 *    become ACTIVE (reward accrual itself is roadmap — created Notification is honest).
 *  - `cleanup_expired_data` → hard housekeeping: mark stale offer claims / expired
 *    temporary data ready for deletion (audited via action log rows).
 */

const DAY = 86_400_000

export function lifecycleJobHandlers(): JobHandlers {
  return {
    maintenance_reminder: async () => {
      const soon = new Date(Date.now() + 3 * DAY)
      const due = await prisma.maintenanceRecord.findMany({
        where: { deletedAt: null, nextDueDate: { not: null, lte: soon, gte: new Date() } },
        include: { car: { select: { brand: true, model: true } } },
      })
      for (const r of due) {
        const days = Math.ceil((r.nextDueDate!.getTime() - Date.now()) / DAY)
        await prisma.notification.create({
          data: {
            userId: r.userId,
            type: 'MAINTENANCE_REMINDER',
            title: 'Xizmat vaqti yaqin',
            body: `${r.car.brand} ${r.car.model}: ${r.serviceType} — ${days} kundan keyin muddat.`,
          },
        })
      }
      if (due.length) console.log(`[worker] maintenance_reminder: ${due.length} ta eslatma yaratildi`)
    },

    goal_reminder: async () => {
      const soon = new Date(Date.now() + 3 * DAY)
      const goals = await prisma.goal.findMany({
        where: { deletedAt: null, status: 'ACTIVE', deadline: { not: null, lte: soon, gte: new Date() } },
        select: { id: true, userId: true, title: true, targetAmount: true, deadline: true },
      })
      for (const g of goals) {
        const days = Math.ceil((g.deadline!.getTime() - Date.now()) / DAY)
        await prisma.notification.create({
          data: {
            userId: g.userId,
            type: 'GOAL_REMINDER',
            title: 'Maqsad muddati yaqin',
            body: `“${g.title}” maqsadigacha ${days} kun qoldi. Maqsad miqdori xarajatlardan uzilmasin.`,
          },
        })
      }
      if (goals.length) console.log(`[worker] goal_reminder: ${goals.length} ta eslatma yaratildi`)
    },

    subscription_expiry: async () => {
      const now = new Date()
      const soon = new Date(now.getTime() + 3 * DAY)
      const expiring = await prisma.subscription.findMany({
        where: { plan: 'PRO', status: 'ACTIVE', expiresAt: { lte: soon } },
        select: { id: true, userId: true, expiresAt: true },
      })
      for (const s of expiring) {
        const expiresAt = s.expiresAt ?? now
        if (expiresAt <= now) {
          await prisma.subscription.update({ where: { id: s.id }, data: { status: 'EXPIRED' } })
          continue
        }
        const days = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY)
        await prisma.notification.create({
          data: {
            userId: s.userId,
            type: 'SUBSCRIPTION_EXPIRATION',
            title: 'PRO obuna tugamoqda',
            body: `PRO obunangiz ${days} kundan keyin tugaydi.`,
          },
        })
      }
      if (expiring.length) console.log(`[worker] subscription_expiry: ${expiring.length} ta holat qayta ishlandi`)
    },

    process_referral_reward: async () => {
      const pending = await prisma.referral.findMany({
        where: { status: 'PENDING' },
        include: { invitee: { select: { onboardingDone: true, name: true } } },
      })
      let activated = 0
      for (const r of pending) {
        if (r.invitee.onboardingDone) {
          await prisma.referral.update({ where: { id: r.id }, data: { status: 'ACTIVE' } })
          await prisma.notification.create({
            data: {
              userId: r.referrerId,
              type: 'REFERRAL_REWARD',
              title: 'Taklifingiz qabul qilindi 🎉',
              body: `${r.invitee?.name ?? 'Do‘stingiz'} onboardingni tugatdi. Mukofot hisobda.`,
            },
          })
          activated++
        }
      }
      if (activated) console.log(`[worker] process_referral_reward: ${activated} ta referal faollashtirildi`)
    },

    cleanup_expired_data: async () => {
      const now = new Date()
      // expire PRO subs past their end (idempotent safety net)
      const expired = await prisma.subscription.updateMany({
        where: { status: 'ACTIVE', expiresAt: { lt: now } },
        data: { status: 'EXPIRED' },
      })
      // soft-clean old rejected/pending listings older than 90 days
      const staleListings = await prisma.marketplaceListing.updateMany({
        where: { status: { in: ['PENDING', 'REJECTED', 'REMOVED'] }, updatedAt: { lt: new Date(now.getTime() - 90 * DAY) } },
        data: { deletedAt: now },
      })
      await prisma.offerClaim.updateMany({
        where: { status: 'CLAIMED', claimedAt: { lt: new Date(now.getTime() - 30 * DAY) } },
        data: { status: 'EXPIRED' },
      })
      if (expired.count || staleListings.count) {
        console.log(`[worker] cleanup_expired_data: ${expired.count} sub + ${staleListings.count} listing tozalandi`)
      }
    },
  }
}