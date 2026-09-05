import { prisma } from '@driverhub/database'
import {
  buildDailySeries,
  buildDriverContext,
  buildRecommendations,
  buildWeeklySeries,
  buildCoachPlan,
  computeInsights,
  computePeriod,
  computeMoneyTable,
  expenseCoverageRatio,
  expensesAreIncomplete,
  trendChangePct,
  sessionHours,
  sum,
  type DayPoint,
  type WeekPoint,
  type MoneyInsight,
  type SessionInput,
  type DriverContext,
} from '@driverhub/ai'

const DAY_MS = 86_400_000

export interface TodaySummary {
  date: string
  income: number
  expenses: number
  netProfit: number
  hours: number
  minutes: number
  trips: number
  profitPerHour: number
  incomeChangePct: number | null
  expensesIncomplete: boolean
  workStarted: boolean
}

export interface GoalProgressRow {
  goalId: string
  title: string
  emoji: string
  targetAmount: number
  savedAmount: number
  progressPct: number
  dailyTarget: number
  onPace: boolean | null
  deadlineDaysLeft: number | null
}

export interface DashboardPayload {
  today: TodaySummary
  goal: GoalProgressRow | null
  driverScore: number | null
  aiRecommendation: string | null
  activeChallenges: { id: string; name: string; endDate: string }[]
  clubOffers: { id: string; title: string; discountText: string | null; partnerName: string }[]
  vehicles: { id: string; brand: string; model: string; mileageKms: number; plate: string | null }[]
  workSessionId: string | null
}

function startOf(today: Date): Date {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

async function loadFinance(userId: string, since?: Date) {
  const where = { userId, deletedAt: null, ...(since ? { date: { gte: since } } : {}) }
  const [income, expenses, sessions] = await Promise.all([
    prisma.incomeRecord.findMany({ where, select: { amount: true, date: true, platform: true, tripCount: true } }),
    prisma.expenseRecord.findMany({ where, select: { amount: true, date: true, category: true } }),
    prisma.workSession.findMany({
      where: { userId, ...(since ? { startedAt: { gte: since } } : {}) },
      select: { id: true, startedAt: true, endedAt: true, status: true },
    }),
  ])
  return { income, expenses, sessions }
}

export async function getDashboard(userId: string, now = new Date()): Promise<DashboardPayload> {
  const dayStart = startOf(now)
  const tIncome = await prisma.incomeRecord.findMany({
    where: { userId, deletedAt: null, date: { gte: dayStart } },
  })
  const tExpenses = await prisma.expenseRecord.findMany({
    where: { userId, deletedAt: null, date: { gte: dayStart } },
  })
  const activeSession = await prisma.workSession.findFirst({
    where: { userId, status: 'ACTIVE' },
  })
  const todaySessions = await prisma.workSession.findMany({
    where: { userId, startedAt: { gte: dayStart } },
  })
  const yesterdayStart = new Date(dayStart.getTime() - DAY_MS)
  const yIncome = await prisma.incomeRecord.findMany({
    where: { userId, deletedAt: null, date: { gte: yesterdayStart, lt: dayStart } },
  })
  const yExpenses = await prisma.expenseRecord.findMany({
    where: { userId, deletedAt: null, date: { gte: yesterdayStart, lt: dayStart } },
  })

  const incomeToday = sum(tIncome.map((r) => r.amount))
  const expensesToday = sum(tExpenses.map((r) => r.amount))
  const netToday = incomeToday - expensesToday
  const hoursToday = sum(
    todaySessions.map((s) => (s.endedAt ? (s.endedAt.getTime() - s.startedAt.getTime()) / 3_600_000 : 0))
  )
  const minutes = Math.round(hoursToday * 60)
  const tripsToday = sum(tIncome.map((r) => r.tripCount ?? 0))

  const prevNet = sum(yIncome.map((r) => r.amount)) - sum(yExpenses.map((r) => r.amount))
  const incomeChangePct = trendChangePct(netToday, prevNet)

  // 30d for AI + coverage
  const since30 = new Date(now.getTime() - 29 * DAY_MS)
  const { income, expenses, sessions } = await loadFinance(userId)
  const inc30 = income.filter((r) => r.date >= since30)
  const exp30 = expenses.filter((e) => e.date >= since30)
  const coverage = expenseCoverageRatio(inc30, exp30, [])
  const expensesIncomplete = expensesAreIncomplete(coverage)

  const [goal, score, challenges, vehicles] = await Promise.all([
    getPrimaryGoal(userId, now),
    prisma.driverScore.findUnique({ where: { userId } }),
    prisma.challengeParticipant.findMany({
      where: { userId, status: 'JOINED', challenge: { status: 'ACTIVE' } },
      select: { challenge: { select: { id: true, name: true, endDate: true } } },
    }),
    prisma.car.findMany({ where: { userId, deletedAt: null } }),
  ])

  const clubOffers = await prisma.partnerOffer.findMany({
    where: { status: 'APPROVED', validUntil: { gt: now }, deletedAt: null },
    take: 3,
    include: { partner: { select: { businessName: true } } },
    orderBy: { featured: 'desc' },
  })

  // AI recommendation (deterministic, based on own data)
  const driver = await prisma.driver.findUnique({ where: { userId } })
  const car = vehicles[0]
  const ctx = buildDriverContext({
    income: inc30,
    expenses: exp30,
    sessions: sessions.map((s) => ({ startedAt: s.startedAt, endedAt: s.endedAt })),
    goalProgress: goal ? goal.progressPct / 100 : null,
    vehicleKm: car?.mileageKms ?? null,
    level: driver?.level ?? 'ROOKIE',
    now,
  })
  const recs = buildRecommendations(ctx)
  const aiRecommendation = recs[0] ? `${recs[0].title}: ${recs[0].text}` : null

  return {
    today: {
      date: dayStart.toISOString().slice(0, 10),
      income: incomeToday,
      expenses: expensesToday,
      netProfit: netToday,
      hours: Math.round(hoursToday * 100) / 100,
      minutes,
      trips: tripsToday,
      profitPerHour: hoursToday > 0 ? Math.round(netToday / hoursToday) : 0,
      incomeChangePct,
      expensesIncomplete,
      workStarted: !!activeSession,
    },
    goal,
    driverScore: score?.score ?? null,
    aiRecommendation,
    activeChallenges: challenges.map((c) => ({
      id: c.challenge.id,
      name: c.challenge.name,
      endDate: c.challenge.endDate.toISOString(),
    })),
    clubOffers: clubOffers.map((o) => ({
      id: o.id,
      title: o.title,
      discountText: o.discountText,
      partnerName: o.partner.businessName,
    })),
    vehicles: vehicles.map((v) => ({
      id: v.id,
      brand: v.brand,
      model: v.model,
      mileageKms: v.mileageKms,
      plate: v.plate,
    })),
    workSessionId: activeSession?.id ?? null,
  }
}

/** Pick the "primary" goal: first ACTIVE with progress, else latest. */
export async function getPrimaryGoal(userId: string, now = new Date()): Promise<GoalProgressRow | null> {
  const goal = await prisma.goal.findFirst({
    where: { userId, deletedAt: null, status: 'ACTIVE' },
    include: { transactions: { select: { amount: true } } },
    orderBy: { createdAt: 'desc' },
  })
  if (!goal) return null
  const saved = sum(goal.transactions.map((t) => t.amount))
  const progressPct = goal.targetAmount > 0 ? Math.min(100, Math.round((saved / goal.targetAmount) * 100)) : 0
  const daysLeft = goal.deadline
    ? Math.max(0, Math.ceil((goal.deadline.getTime() - now.getTime()) / DAY_MS))
    : null
  const dailyTarget = goal.deadline && daysLeft !== null ? Math.ceil((goal.targetAmount - saved) / Math.max(1, daysLeft)) : null
  return {
    goalId: goal.id,
    title: goal.title,
    emoji: goal.emoji ?? '🎯',
    targetAmount: goal.targetAmount,
    savedAmount: saved,
    progressPct,
    dailyTarget: dailyTarget ?? Math.ceil(goal.targetAmount / 30),
    onPace: dailyTarget !== null ? saved / Math.max(1, goal.targetAmount) >= 0.5 : null,
    deadlineDaysLeft: daysLeft,
  }
}

// ==================== Analytics (spec §14) ====================

export interface AnalyticsRangeOutput {
  summary: ReturnType<typeof computePeriod>
  daily: DayPoint[]
  weekly: WeekPoint[]
  insights: MoneyInsight[]
  coverage: number
}

export async function getAnalyticsRange(
  userId: string,
  rangeDays: number,
  now = new Date()
): Promise<AnalyticsRangeOutput> {
  const startedAt = new Date(now.getTime() - (rangeDays - 1) * DAY_MS)
  const since = startOf(startedAt)
  const [income, expenses, sessions, car] = await Promise.all([
    prisma.incomeRecord.findMany({ where: { userId, deletedAt: null }, select: { amount: true, date: true, tripCount: true } }),
    prisma.expenseRecord.findMany({ where: { userId, deletedAt: null }, select: { amount: true, date: true, category: true } }),
    prisma.workSession.findMany({ where: { userId }, select: { startedAt: true, endedAt: true, status: true } }),
    prisma.car.findFirst({ where: { userId, deletedAt: null, isPrimary: true } }),
  ])

  const inRangeInc = income.filter((r) => r.date >= since)
  const inRangeExp = expenses.filter((e) => e.date >= since)
  const inRangeSessions = (sessions.filter((s) => s.startedAt >= since) as SessionInput[])
  // Distance-based rates are only produced when the car has a recorded odometer delta.
  // We have a single current odo reading (no history per period) => honest `null`
  // rather than inventing kilometres (spec RULE 4 / §9).
  void car
  const mileageDelta = null

  const summary = computePeriod({
    income: inRangeInc,
    expenses: inRangeExp,
    sessions: inRangeSessions,
    distanceKm: mileageDelta,
  })
  const daily = buildDailySeries(income, expenses, sessions.map((s) => ({ startedAt: s.startedAt, endedAt: s.endedAt })), {
    startDate: since,
  }).slice(-rangeDays)
  const weekly = buildWeeklySeries(income, expenses, sessions.map((s) => ({ startedAt: s.startedAt, endedAt: s.endedAt }))).filter(
    (w) => w.weekStart >= since.toISOString().slice(0, 10)
  )
  const insights = computeInsights({ income, expenses, sessions, startDate: since, minDays: 5 })
  const coverage = expenseCoverageRatio(inRangeInc, inRangeExp, inRangeSessions)

  return { summary, daily, weekly, insights, coverage }
}

export type { MoneyInsight, DayPoint, WeekPoint, DriverContext }

export { buildDriverContext, buildRecommendations, buildCoachPlan, computeMoneyTable }
export { sessionHours }