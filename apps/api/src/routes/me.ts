import type { FastifyInstance } from 'fastify'
import { prisma } from '@driverhub/database'
import { onboardingSchema, updateProfileSchema, privacySchema } from '@driverhub/validation'
import { computeMoneyTable, buildWeeklySeries, money } from '@driverhub/ai'
import { getDashboard, getAnalyticsRange } from '../services/driverAnalytics.js'
import { computeAndSaveScore } from '../services/scoreService.js'
import { ApiError } from '../lib/errors.js'
import { uid, takeNum } from './helpers.js'
import { publicUser } from './auth.js'

// ==================== /me/* routes (driver account & dashboard) ====================

export async function meRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  // ---- profile ----
  app.get('/me', { preHandler: driverOnly }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: uid(req) } })
    if (!user) throw ApiError.unauthorized()
    const [driver, score] = await Promise.all([
      prisma.driver.findUnique({ where: { userId: user.id } }),
      prisma.driverScore.findUnique({ where: { userId: user.id } }),
    ])
    return { ...publicUser(user), driver, score: score?.score ?? null }
  })

  app.post('/me/onboarding', { preHandler: driverOnly }, async (req) => {
    const body = onboardingSchema.parse(req.body)
    const userId = uid(req)
    const user = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { name: body.name, phone: body.phone ?? null, driverType: body.driverType, onboardingDone: true, onboardingStep: 6 },
      })
      await tx.driver.upsert({
        where: { userId },
        create: {
          userId,
          driverType: body.driverType,
          incomeTargetMonth: body.incomeTarget ?? null,
          primaryGoal: body.primaryGoal ?? null,
        },
        update: {
          driverType: body.driverType,
          incomeTargetMonth: body.incomeTarget ?? undefined,
          primaryGoal: body.primaryGoal ?? undefined,
        },
      })
      return tx.user.findUniqueOrThrow({ where: { id: userId } })
    })
    return { user: publicUser(user) }
  })

  app.patch('/me', { preHandler: driverOnly }, async (req) => {
    const body = updateProfileSchema.parse(req.body)
    const userId = uid(req)
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: body.name, phone: body.phone ?? undefined, driverType: body.driverType },
    })
    if (body.driverType || body.incomeTarget !== undefined) {
      await prisma.driver.update({
        where: { userId },
        data: { driverType: body.driverType, incomeTargetMonth: body.incomeTarget },
      })
    }
    return { user: publicUser(user) }
  })

  app.patch('/me/privacy', { preHandler: driverOnly }, async (req) => {
    const body = privacySchema.parse(req.body)
    const userId = uid(req)
    const driver = await prisma.driver.update({
      where: { userId },
      data: { privacy: { ...(body as object) } },
    })
    return { privacy: driver.privacy }
  })

  // ---- dashboard ----
  app.get('/me/dashboard', { preHandler: driverOnly }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: uid(req) } })
    if (!user) throw ApiError.unauthorized()
    const payload = await getDashboard(user.id)
    return { ...payload, isDemo: user.isDemo, profile: publicUser(user) }
  })

  // ---- analytics (spec §14) ----
  app.get('/me/analytics', { preHandler: driverOnly }, async (req) => {
    const rangeDays = takeNum((req.query as { range?: string }).range ?? 30, 30)
    const out = await getAnalyticsRange(uid(req), [7, 30, 90].includes(rangeDays) ? rangeDays : 30)
    return out
  })

  // ---- money table (monthly averages) ----
  app.get('/me/money-table', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    const now = new Date()
    const [income, expenses, sessions] = await Promise.all([
      prisma.incomeRecord.findMany({ where: { userId, deletedAt: null } }),
      prisma.expenseRecord.findMany({ where: { userId, deletedAt: null } }),
      prisma.workSession.findMany({ where: { userId } }),
    ])
    return computeMoneyTable(
      income.map((r) => ({ amount: r.amount, date: r.date, platform: r.platform, tripCount: r.tripCount })),
      expenses.map((e) => ({ amount: e.amount, date: e.date, category: e.category })),
      sessions.map((s) => ({ startedAt: s.startedAt, endedAt: s.endedAt })),
      now
    )
  })

  // ---- shareable weekly card (spec §34) ----
  app.get('/me/share-week', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    const now = new Date()
    const [income, expenses, sessions, score] = await Promise.all([
      prisma.incomeRecord.findMany({ where: { userId, deletedAt: null }, select: { amount: true, date: true, tripCount: true } }),
      prisma.expenseRecord.findMany({ where: { userId, deletedAt: null }, select: { amount: true, date: true } }),
      prisma.workSession.findMany({ where: { userId }, select: { startedAt: true, endedAt: true } }),
      prisma.driverScore.findUnique({ where: { userId } }),
    ])
    const weeks = buildWeeklySeries(
      income.map((r) => ({ amount: r.amount, date: r.date, tripCount: r.tripCount })),
      expenses.map((e) => ({ amount: e.amount, date: e.date })),
      sessions.map((s) => ({ startedAt: s.startedAt, endedAt: s.endedAt }))
    )
    const week = weeks[weeks.length - 1]
    const hours = sessions
      .filter((s) => s.endedAt)
      .reduce((acc, s) => (acc + (s.endedAt!.getTime() - s.startedAt.getTime()) / 3_600_000), 0)
    return {
      title: 'Bu hafta men',
      income: week?.income ?? 0,
      expenses: week?.expenses ?? 0,
      net: week ? week.income - week.expenses : 0,
      hours: `${Math.round(hours)} soat`,
      score: score?.score ?? null,
    }
  })

  // ---- score (spec §18) ----
  app.get('/me/score', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    const [score, driver] = await Promise.all([
      prisma.driverScore.findUnique({ where: { userId } }),
      prisma.driver.findUnique({ where: { userId } }),
    ])
    return {
      score: score?.score ?? null,
      components: score?.components ?? null,
      level: driver?.level ?? 'ROOKIE',
      xp: driver?.xp ?? 0,
      computedAt: score?.computedAt?.toISOString() ?? null,
    }
  })

  app.post('/me/score/recompute', { preHandler: driverOnly }, async (req) => {
    const result = await computeAndSaveScore(uid(req))
    return result
  })

  // ---- GDPR: data export & account deletion (spec §35) ----
  app.get('/me/export', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    const data = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cars: { where: { deletedAt: null } },
        incomeRecords: { where: { deletedAt: null } },
        expenseRecords: { where: { deletedAt: null } },
        workSessions: true,
        goals: { where: { deletedAt: null } },
        driver: true,
        driverScore: true,
      },
    })
    return { exportedAt: new Date().toISOString(), data }
  })

  app.delete('/me', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } })
    return { ok: true }
  })
}

export { money }