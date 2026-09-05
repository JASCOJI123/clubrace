import type { FastifyInstance } from 'fastify'
import { prisma } from '@driverhub/database'
import { idParam } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { takeNum, uid } from './helpers.js'

// ==================== Challenges (spec §20) ====================
// Drivers join active challenges; per-challenge leaderboard respects privacy opt-out.

export async function challengesRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.get('/challenges', { preHandler: driverOnly }, async (req) => {
    const q = req.query as { onlyActive?: string; take?: string }
    const userId = uid(req)
    const today = new Date()
    const rows = await prisma.challenge.findMany({
      where: {
        ...(q.onlyActive === 'true' ? { status: 'ACTIVE', startDate: { lte: today }, endDate: { gte: today } } : {}),
      },
      orderBy: { endDate: 'asc' },
      take: takeNum(q.take, 20),
      include: {
        participants: true,
        _count: { select: { participants: true } },
      },
    })
    return {
      items: rows.map(({ participants, _count, ...c }) => ({
        ...c,
        participantCount: _count.participants,
        joined: participants.some((p) => p.userId === userId),
        status: c.status,
      })),
    }
  })

  app.post('/challenges/:id/join', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const userId = uid(req)
    const challenge = await prisma.challenge.findFirst({
      where: { id, status: 'ACTIVE', startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    })
    if (!challenge) throw ApiError.notFound('Faol challenge topilmadi')
    try {
      const participant = await prisma.challengeParticipant.create({ data: { challengeId: id, userId } })
      return { participant }
    } catch {
      throw ApiError.conflict('Siz bu challenge-ga allaqachon qo‘shilgansiz')
    }
  })

  app.get('/challenges/my', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    const rows = await prisma.challengeParticipant.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      include: { challenge: { select: { id: true, name: true, description: true, startDate: true, endDate: true, status: true, reward: true } } },
    })
    return { items: rows.map(({ challenge, ...p }) => ({ ...challenge, participant: p })) }
  })

  app.get('/challenges/:id/leaderboard', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const userId = uid(req)
    const challenge = await prisma.challenge.findUnique({ where: { id } })
    if (!challenge) throw ApiError.notFound('Challenge topilmadi')

    const participants = await prisma.challengeParticipant.findMany({
      where: { challengeId: id, optedOutLeaderboard: false },
      include: { user: { select: { id: true, name: true, driverScore: true } } },
    })
    const ids = participants.map((p) => p.user.id)
    const privacyRows = await prisma.driver.findMany({ where: { userId: { in: ids } }, select: { userId: true, privacy: true } })
    const privacyMap = new Map(privacyRows.map((d) => [d.userId, d.privacy as Record<string, boolean> | null]))

    // privacy rule (spec §19/§35): users who disabled leaderboard visibility never appear
    const visible = participants.filter((p) => privacyMap.get(p.user.id)?.leaderboard !== false)

    const ranked = visible
      .map((p) => ({
        userId: p.user.id,
        name: p.user.name,
        resultValue: p.resultValue,
        score: p.user.driverScore?.score ?? null,
        isMe: p.user.id === userId,
      }))
      .sort((a, b) => {
        const av = a.resultValue ?? a.score ?? -1
        const bv = b.resultValue ?? b.score ?? -1
        return bv - av
      })
      .map((entry, i) => ({ ...entry, rank: i + 1 }))

    return { challenge, items: ranked }
  })

  // opt out of a leaderboard
  app.patch('/challenges/:id/opt-out', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const userId = uid(req)
    const body = (req.body ?? {}) as { optOut: boolean }
    await prisma.challengeParticipant.updateMany({
      where: { challengeId: id, userId },
      data: { optedOutLeaderboard: !!body.optOut },
    })
    return { ok: true }
  })
}