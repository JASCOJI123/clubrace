import type { FastifyInstance } from 'fastify'
import { prisma } from '@driverhub/database'
import { uid } from './helpers.js'

// ==================== Referrals (spec §26) ====================
// Driver's own referral dashboard: code + invited friends + reward status.

export async function referralsRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.get('/referrals', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    const [user, given, received] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.referral.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          invitee: { select: { name: true, onboardingDone: true } },
          rewards: true,
        },
      }),
      prisma.referral.findUnique({ where: { inviteeId: userId }, include: { referrer: { select: { name: true } } } }),
    ])

    const active = given.map((r) => r).filter((r) => r.status !== 'PENDING').length
    const rewarded = given.filter((r) => r.status === 'REWARDED').length

    return {
      myCode: user?.referralCode ?? null,
      shareText: user?.referralCode
        ? `Driver Hub: taxikkaftingizni do‘stlarga ulashib PRO oling! Havola: ${user.referralCode}`
        : null,
      referredBy: received?.referrer.name ?? null,
      stats: { total: given.length, active, rewarded },
      items: given.map((r) => ({
        id: r.id,
        inviteeName: r.invitee.name,
        inviteeOnboarded: r.invitee.onboardingDone,
        status: r.status,
        createdAt: r.createdAt,
        reward: r.rewards[0] ?? null,
      })),
    }
  })
}