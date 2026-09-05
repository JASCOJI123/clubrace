import type { FastifyInstance } from 'fastify'
import { prisma } from '@driverhub/database'
import { goalSchema, goalTransactionSchema, idParam } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { uid } from './helpers.js'

// ==================== Goals (spec §11) ====================

export async function goalsRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.get('/goals', { preHandler: driverOnly }, async (req) => {
    const goals = await prisma.goal.findMany({
      where: { userId: uid(req), deletedAt: null },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { transactions: { select: { amount: true } } },
    })
    return {
      items: goals.map((g) => {
        const savedAmount = g.transactions.reduce((s, t) => s + t.amount, 0)
        return { ...g, savedAmount, progressPct: g.targetAmount > 0 ? Math.round((savedAmount / g.targetAmount) * 100) : 0 }
      }),
    }
  })

  app.post('/goals', { preHandler: driverOnly }, async (req) => {
    const body = goalSchema.parse(req.body)
    const goal = await prisma.goal.create({ data: { ...body, userId: uid(req) } })
    return { goal }
  })

  app.patch('/goals/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = goalSchema.partial().parse(req.body)
    await assertOwnedGoal(uid(req), id)
    const goal = await prisma.goal.update({ where: { id }, data: body })
    return { goal }
  })

  app.delete('/goals/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await assertOwnedGoal(uid(req), id)
    await prisma.goal.update({ where: { id }, data: { deletedAt: new Date() } })
    return { ok: true }
  })

  // deposit money toward the goal
  app.post('/goals/:id/transactions', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = goalTransactionSchema.omit({ goalId: true }).parse(req.body)
    await assertOwnedGoal(uid(req), id)
    const txn = await prisma.goalTransaction.create({ data: { goalId: id, amount: body.amount, note: body.note ?? null } })
    const saved = await prisma.goalTransaction.groupBy({ by: ['goalId'], where: { goalId: id }, _sum: { amount: true } })
    const goal = await prisma.goal.findUniqueOrThrow({ where: { id } })
    const savedAmount = saved[0]?._sum.amount ?? 0
    return { txn, savedAmount, progressPct: Math.round((savedAmount / goal.targetAmount) * 100) }
  })

  // change goal state: PAUSED / COMPLETED / ARCHIVED
  app.patch('/goals/:id/status', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = (req.body ?? {}) as { status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED' }
    if (!body.status || !['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'].includes(body.status)) {
      throw ApiError.badRequest('status noto‘g‘ri')
    }
    await assertOwnedGoal(uid(req), id)
    const goal = await prisma.goal.update({ where: { id }, data: { status: body.status } })
    return { goal }
  })
}

async function assertOwnedGoal(userId: string, id: string) {
  const goal = await prisma.goal.findFirst({ where: { id, userId, deletedAt: null } })
  if (!goal) throw ApiError.notFound('Maqsad topilmadi')
  return goal
}