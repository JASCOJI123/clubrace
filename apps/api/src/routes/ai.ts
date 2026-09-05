import type { FastifyInstance } from 'fastify'
import { prisma } from '@driverhub/database'
import { aiChatSchema, aiCoachSchema } from '@driverhub/validation'
import { buildDriverContext, buildCoachPlan, formatCoachPlan, askAI, money, type DriverContext } from '@driverhub/ai'
import { getEnv, getFlags } from '../env.js'
import { ApiError } from '../lib/errors.js'
import { uid } from './helpers.js'

const DAY_MS = 86_400_000

// ==================== AI (spec §12, §13, §43) ====================
// Deterministic + honest by default; Claude chat only when AI_API_KEY is configured.

export async function aiRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]
  const flags = getFlags()

  async function buildContextFor(userId: string): Promise<{ ctx: DriverContext; extraFacts: string[] }> {
    const now = new Date()
    const since30 = new Date(now.getTime() - 29 * DAY_MS)
    const [income, expenses, sessions, car, driver, goal, dueMaintenance] = await Promise.all([
      prisma.incomeRecord.findMany({ where: { userId, deletedAt: null }, select: { amount: true, date: true, platform: true, tripCount: true } }),
      prisma.expenseRecord.findMany({ where: { userId, deletedAt: null }, select: { amount: true, date: true, category: true } }),
      prisma.workSession.findMany({ where: { userId }, select: { startedAt: true, endedAt: true } }),
      prisma.car.findFirst({ where: { userId, deletedAt: null, isPrimary: true } }),
      prisma.driver.findUnique({ where: { userId } }),
      prisma.goal.findFirst({ where: { userId, deletedAt: null, status: 'ACTIVE' }, include: { transactions: { select: { amount: true } } } }),
      prisma.maintenanceRecord.findMany({ where: { userId, deletedAt: null, nextDueDate: { lte: new Date(now.getTime() + 30 * DAY_MS) } }, orderBy: { nextDueDate: 'asc' } }),
    ])
    const inc30 = income.filter((r) => r.date >= since30)
    const exp30 = expenses.filter((e) => e.date >= since30)
    const goalProgress = goal && goal.targetAmount > 0 ? Math.min(1, goal.transactions.reduce((s, t) => s + t.amount, 0) / goal.targetAmount) : null

    const ctx = buildDriverContext({
      income: inc30,
      expenses: exp30,
      sessions: sessions.map((s) => ({ startedAt: s.startedAt, endedAt: s.endedAt })),
      goalProgress,
      vehicleKm: car?.mileageKms ?? null,
      level: driver?.level ?? 'ROOKIE',
      now,
    })
    const extraFacts = dueMaintenance.map(
      (m) => `Keyingi servis: ${m.serviceType} — ${formatDate(m.nextDueDate ?? m.date)}`
    )
    return { ctx, extraFacts }
  }

  app.post('/ai/chat', { preHandler: driverOnly }, async (req) => {
    const body = aiChatSchema.parse(req.body)
    const userId = uid(req)
    const { ctx, extraFacts } = await buildContextFor(userId)
    const response = await askAI(body.message, {
      context: ctx,
      provider: flags.aiAvailable ? 'anthropic' : 'deterministic',
      apiKey: getEnv().AI_API_KEY ?? undefined,
      model: getEnv().AI_MODEL,
      extraFacts,
    })
    return response
  })

  app.post('/ai/coach', { preHandler: driverOnly }, async (req) => {
    const body = aiCoachSchema.parse(req.body ?? {})
    const userId = uid(req)
    const today = new Date()
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const [todayInc, todayExp, base] = await Promise.all([
      prisma.incomeRecord.findMany({ where: { userId, deletedAt: null, date: { gte: dayStart } } }),
      prisma.expenseRecord.findMany({ where: { userId, deletedAt: null, date: { gte: dayStart } } }),
      prisma.driver.findUnique({ where: { userId } }),
    ])
    let goalAmount = body.goalAmount
    if (!goalAmount) {
      const target = base?.incomeTargetMonth
      if (!target) throw ApiError.badRequest('Maqsad summasi kerak (goalAmount) yoki incomeTarget sozlang')
      goalAmount = Math.round(target / 30)
    }
    const { ctx, extraFacts } = await buildContextFor(userId)
    void extraFacts
    const plan = buildCoachPlan({
      goalAmount,
      ctx,
      todayIncome: todayInc.reduce((s, r) => s + r.amount, 0),
      todayExpenses: todayExp.reduce((s, r) => s + r.amount, 0),
    })
    const formatted = formatCoachPlan(plan)
    return { plan, formatted, isEstimate: plan.canEstimate }
  })

  // deterministic statistics snapshot used by the AI Coach card (spec §12)
  app.get('/ai/stats', { preHandler: driverOnly }, async (req) => {
    const { ctx } = await buildContextFor(uid(req))
    return {
      income30d: money(ctx.income30d),
      expenses30d: money(ctx.expenses30d),
      netProfit30d: money(ctx.netProfit30d),
      avgHourlyNet: ctx.avgHourlyNet !== null ? money(ctx.avgHourlyNet) : null,
      daysTracked30: ctx.daysTracked30,
      expenseCoverage: ctx.expenseCoverage,
      fuelShareOfExpenses30d: ctx.fuelShareOfExpenses30d,
    }
  })
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
void DAY_MS