import type { FastifyInstance } from 'fastify'
import { prisma } from '@driverhub/database'
import { idParam } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { uid, takeNum } from './helpers.js'

// ==================== Work sessions (spec §10) ====================
// Start traffic, finish it, and later attach income/expenses to the session.

export async function workSessionsRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.get('/work-sessions/current', { preHandler: driverOnly }, async (req) => {
    const session = await prisma.workSession.findFirst({
      where: { userId: uid(req), status: 'ACTIVE' },
      include: { income: true, expenses: true },
    })
    if (!session) return { session: null }
    const income = session.income.reduce((s, r) => s + r.amount, 0)
    const expenses = session.expenses.reduce((s, r) => s + r.amount, 0)
    const durationMinutes = Math.round((Date.now() - session.startedAt.getTime()) / 60_000)
    return { session: { ...session, income, expenses, durationMinutes } }
  })

  app.post('/work-sessions/start', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    const active = await prisma.workSession.findFirst({ where: { userId, status: 'ACTIVE' } })
    if (active) throw ApiError.conflict('Faol sessiya allaqachon mavjud')
    const session = await prisma.workSession.create({
      data: { userId, startedAt: new Date(), status: 'ACTIVE' },
    })
    return { session }
  })

  app.post('/work-sessions/:id/finish', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const userId = uid(req)
    const session = await prisma.workSession.findFirst({ where: { id, userId, status: 'ACTIVE' } })
    if (!session) throw ApiError.notFound('Faol sessiya topilmadi')
    const endedAt = new Date()
    const finished = await prisma.workSession.update({
      where: { id },
      data: { status: 'ENDED', endedAt },
    })
    const [income, expenses] = await Promise.all([
      prisma.incomeRecord.findMany({ where: { userId, workSessionId: id, deletedAt: null } }),
      prisma.expenseRecord.findMany({ where: { userId, workSessionId: id, deletedAt: null } }),
    ])
    const incomeSum = income.reduce((s, r) => s + r.amount, 0)
    const expenseSum = expenses.reduce((s, r) => s + r.amount, 0)
    return {
      session: finished,
      durationMinutes: Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60_000),
      income: incomeSum,
      expenses: expenseSum,
      netProfit: incomeSum - expenseSum,
    }
  })

  app.get('/work-sessions', { preHandler: driverOnly }, async (req) => {
    const q = req.query as { cursor?: string; take?: string }
    const take = takeNum(q.take, 20)
    const userId = uid(req)
    const sessions = await prisma.workSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: take + 1,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      include: {
        _count: { select: { income: true, expenses: true } },
      },
    })
    const items = sessions.slice(0, take)
    // enrich each with sum of linked finance
    const ids = items.map((s) => s.id)
    const [inc, exp] = await Promise.all([
      prisma.incomeRecord.groupBy({ by: ['workSessionId'], where: { workSessionId: { in: ids }, deletedAt: null }, _sum: { amount: true } }),
      prisma.expenseRecord.groupBy({ by: ['workSessionId'], where: { workSessionId: { in: ids }, deletedAt: null }, _sum: { amount: true } }),
    ])
    const enrich = items.map((s) => {
      const i = inc.find((r) => r.workSessionId === s.id)?._sum.amount ?? 0
      const e = exp.find((r) => r.workSessionId === s.id)?._sum.amount ?? 0
      const durationMinutes = s.endedAt ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60_000) : null
      return { ...s, income: i, expenses: e, netProfit: i - e, durationMinutes }
    })
    return { items: enrich, nextCursor: sessions.length > take ? sessions[take]!.id : null }
  })
}