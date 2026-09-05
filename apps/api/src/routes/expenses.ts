import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@driverhub/database'
import { expenseSchema, idParam } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { paginate, uid, takeNum } from './helpers.js'

// ==================== Expense records (spec §9, §42 receipts) ====================

export async function expensesRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.get('/expenses', { preHandler: driverOnly }, async (req) => {
    const q = req.query as { from?: string; to?: string; category?: string; cursor?: string; take?: string }
    const userId = uid(req)
    const from = q.from ? new Date(q.from) : undefined
    const to = q.to ? new Date(q.to) : undefined
    const pageOf = await paginate(
      { cursor: q.cursor, take: takeNum(q.take, 20) },
      ({ cursor, take }) =>
        prisma.expenseRecord.findMany({
          where: {
            userId,
            deletedAt: null,
            ...(from ? { date: { gte: from } } : {}),
            ...(to ? { date: { lte: to } } : {}),
            ...(q.category ? { category: q.category as never } : {}),
          },
          orderBy: { date: 'desc' },
          take,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        })
    )
    return pageOf
  })

  app.post('/expenses', { preHandler: driverOnly }, async (req) => {
    const body = expenseSchema
      .extend({ receiptUrl: z.string().trim().min(1).max(500).optional() })
      .parse(req.body)
    const userId = uid(req)
    if (body.carId) {
      const car = await prisma.car.findFirst({ where: { id: body.carId, userId, deletedAt: null } })
      if (!car) throw ApiError.notFound('Mashina topilmadi')
    }
    const item = await prisma.expenseRecord.create({
      data: {
        userId,
        amount: body.amount,
        date: body.date,
        category: body.category,
        carId: body.carId ?? null,
        workSessionId: body.workSessionId ?? null,
        notes: body.notes ?? null,
        receiptUrl: body.receiptUrl ?? null,
      },
    })
    return { item }
  })

  app.patch('/expenses/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = expenseSchema
      .partial()
      .merge(z.object({ receiptUrl: z.string().trim().min(1).max(500).optional() }))
      .parse(req.body)
    await assertOwnedExpense(uid(req), id)
    const item = await prisma.expenseRecord.update({ where: { id }, data: { ...body } })
    return { item }
  })

  app.delete('/expenses/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await assertOwnedExpense(uid(req), id)
    await prisma.expenseRecord.update({ where: { id }, data: { deletedAt: new Date() } })
    return { ok: true }
  })
}

async function assertOwnedExpense(userId: string, id: string) {
  const row = await prisma.expenseRecord.findFirst({ where: { id, userId, deletedAt: null } })
  if (!row) throw ApiError.notFound('Xarajat yozuvi topilmadi')
  return row
}