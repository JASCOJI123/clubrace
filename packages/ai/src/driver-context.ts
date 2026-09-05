import { buildDailySeries, computeMoneyTable, computeStreak, expenseCoverageRatio, money, sessionHours, sum } from './analytics.js'
import type { DriverContext, ExpenseInput, IncomeInput, SessionInput } from './types.js'

/**
 * DriverContextBuilder — assembles the structured context that the AI layer
 * consumes (spec §43). The AI receives this JSON, never raw DB access.
 */
export interface BuildContextInput {
  income: IncomeInput[]
  expenses: ExpenseInput[]
  sessions: SessionInput[]
  goalProgress?: number | null
  vehicleKm?: number | null
  level?: string
  now?: Date
}

export function buildDriverContext(input: BuildContextInput): DriverContext {
  const now = input.now ?? new Date()
  const start30 = new Date(now.getTime() - 29 * 86_400_000)

  const inc30 = input.income.filter((r) => r.date >= start30)
  const exp30 = input.expenses.filter((e) => e.date >= start30)
  const sess30 = input.sessions.filter((s) => s.startedAt >= start30)

  const income30d = money(sum(inc30.map((r) => r.amount)))
  const expenses30d = money(sum(exp30.map((e) => e.amount)))
  const netProfit30d = money(income30d - expenses30d)

  const activeDayCount = new Set([
    ...inc30.map((r) => r.date.toISOString().slice(0, 10)),
    ...exp30.map((e) => e.date.toISOString().slice(0, 10)),
    ...sess30.map((s) => s.startedAt.toISOString().slice(0, 10)),
  ]).size

  const hours = sessionHours(sess30)
  const table = computeMoneyTable(inc30, exp30, sess30, now)

  const days = buildDailySeries(inc30, exp30, sess30)
  let bestDay30d: string | null = null
  let bestDayNet = -Infinity
  for (const d of days) {
    if (d.net > bestDayNet) {
      bestDayNet = d.net
      bestDay30d = d.label
    }
  }

  const biggestExpense = exp30.reduce<{ amount: number; category: string } | null>((acc, e) => {
    if (!acc || e.amount > acc.amount) return { amount: e.amount, category: e.category ?? 'OTHER' }
    return acc
  }, null)

  const fuel = exp30.filter((e) => e.category === 'FUEL')
  const fuelTotal = sum(fuel.map((e) => e.amount))

  // Best week net (Monday starting)
  const weekOf = (d: Date) => {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const dow = (day.getDay() + 6) % 7
    return new Date(day.getTime() - dow * 86_400_000).toISOString().slice(0, 10)
  }
  const weekNet = new Map<string, number>()
  for (const r of inc30) weekNet.set(weekOf(r.date), money((weekNet.get(weekOf(r.date)) ?? 0) + r.amount))
  for (const e of exp30) weekNet.set(weekOf(e.date), money((weekNet.get(weekOf(e.date)) ?? 0) - e.amount))
  let bestWeekNet: number | null = null
  for (const v of weekNet.values()) if (bestWeekNet === null || v > bestWeekNet) bestWeekNet = v

  const fuelShareOfExpenses30d =
    expenses30d > 0 ? Math.round((fuelTotal / expenses30d) * 1000) / 10 : null
  const maintenanceCost30d = money(
    sum(exp30.filter((e) => e.category === 'REPAIR' || e.category === 'OIL' || e.category === 'TIRES').map((e) => e.amount))
  )

  return {
    income30d,
    expenses30d,
    netProfit30d,
    avgDailyProfit: money(netProfit30d / 30),
    avgHourlyNet: table.hourlyNet,
    goalProgress: input.goalProgress ?? null,
    daysTracked30: activeDayCount,
    expenseCoverage: Math.round(expenseCoverageRatio(inc30, exp30, sess30) * 100),
    workHours30d: Math.round(hours * 100) / 100,
    trips30d: sum(inc30.map((r) => r.tripCount ?? 0)),
    avgTripValue: table.avgTripIncome,
    biggestExpense30d: biggestExpense,
    bestDay30d,
    bestWeekNet,
    fuelShareOfExpenses30d,
    maintenanceCost30d,
    vehicleKm: input.vehicleKm ?? null,
    level: input.level ?? 'ROOKIE',
    streakDays: computeStreak(inc30, exp30, now),
  }
}