import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@driverhub/database'
import { incomeSchema, idParam } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { paginate, uid, takeNum } from './helpers.js'
import { computePeriod, sessionHours } from '@driverhub/ai'

const zOptionalString = () => z.string().trim().max(500).optional()

// ==================== Income records (spec §9) ====================

export async function incomeRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  // list, optionally by date range (from/to) — cursor paginated
  app.get('/income', { preHandler: driverOnly }, async (req) => {
    const q = req.query as { from?: string; to?: string; cursor?: string; take?: string }
    const userId = uid(req)
    const from = q.from ? new Date(q.from) : undefined
    const to = q.to ? new Date(q.to) : undefined
    const pageOf = await paginate(
      { cursor: q.cursor, take: takeNum(q.take, 20) },
      ({ cursor, take }) =>
        prisma.incomeRecord.findMany({
          where: {
            userId,
            deletedAt: null,
            ...(from ? { date: { gte: from } } : {}),
            ...(to ? { date: { lte: to } } : {}),
          },
          orderBy: { date: 'desc' },
          take,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        })
    )
    return pageOf
  })

  app.post('/income', { preHandler: driverOnly }, async (req) => {
    const body = incomeSchema
      .extend({ receiptUrl: zOptionalString() })
      .parse(req.body)
    const userId = uid(req)
    if (body.carId) {
      const car = await prisma.car.findFirst({ where: { id: body.carId, userId, deletedAt: null } })
      if (!car) throw ApiError.notFound('Mashina topilmadi')
    }
    const item = await prisma.incomeRecord.create({
      data: {
        userId,
        amount: body.amount,
        date: body.date,
        platform: body.platform,
        tripCount: body.tripCount ?? null,
        carId: body.carId ?? null,
        workSessionId: body.workSessionId ?? null,
        notes: body.notes ?? null,
      },
    })
    return { item }
  })

  app.patch('/income/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = incomeSchema.partial().merge(z.object({ receiptUrl: zOptionalString() })).parse(req.body)
    await assertOwnedIncome(uid(req), id)
    const item = await prisma.incomeRecord.update({ where: { id }, data: { ...body } })
    return { item }
  })

  app.delete('/income/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await assertOwnedIncome(uid(req), id)
    await prisma.incomeRecord.update({ where: { id }, data: { deletedAt: new Date() } })
    return { ok: true }
  })

  // summary for current month
  app.get('/income/stats', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const [income, expenses, sessions] = await Promise.all([
      prisma.incomeRecord.findMany({ where: { userId, deletedAt: null, date: { gte: monthStart } } }),
      prisma.expenseRecord.findMany({ where: { userId, deletedAt: null, date: { gte: monthStart } } }),
      prisma.workSession.findMany({ where: { userId, startedAt: { gte: monthStart } } }),
    ])
    const hours = sessionHours(sessions)
    const summary = computePeriod({
      income: income.map((r) => ({ amount: r.amount, date: r.date, tripCount: r.tripCount })),
      expenses: expenses.map((e) => ({ amount: e.amount, date: e.date })),
      sessions: sessions.map((s) => ({ startedAt: s.startedAt, endedAt: s.endedAt })),
    })
    return { ...summary, hours, daysTracked: new Set([...income.map((r) => r.date.toISOString().slice(0, 10)), ...expenses.map((e) => e.date.toISOString().slice(0, 10))]).size }
  })
}

async function assertOwnedIncome(userId: string, id: string) {
  const row = await prisma.incomeRecord.findFirst({ where: { id, userId, deletedAt: null } })
  if (!row) throw ApiError.notFound('Daromad yozuvi topilmadi')
  return row
}