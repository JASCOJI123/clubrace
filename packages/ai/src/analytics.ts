import type { DayPoint, ExpenseInput, IncomeInput, MoneyInsight, PeriodSummary, SessionInput } from './types.js'

/**
 * DriverAnalyticsEngine — deterministic financial math (spec RULE 6 / §9).
 * Everything here is a pure function of the data passed in. It never queries a
 * database and never fabricates values. All amounts are integer UZS.
 */

export const DAY_MS = 86_400_000
export const EPS = 1e-9

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime())
}

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0)
}

/** Clamp to integer so float drift never reaches money output. */
export function money(n: number): number {
  return Math.round(n)
}

export function safeRate(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(denominator) || Math.abs(denominator) < EPS) return null
  return money((numerator / denominator) * 100) / 100
}

// ==================== Period summaries ====================

export interface ComputePeriodInput {
  income: IncomeInput[]
  expenses: ExpenseInput[]
  sessions?: SessionInput[]
  /** Total kms driven in the period (null when unknown). */
  distanceKm?: number | null
  /** Optional window; defaults to ALL records. */
  startDate?: Date
  endDate?: Date
}

export function filterIncomeInRange(
  income: IncomeInput[],
  start?: Date,
  end?: Date
): IncomeInput[] {
  if (!start && !end) return income
  return income.filter((r) => {
    if (start && r.date < start) return false
    if (end && r.date > end) return false
    return true
  })
}

export function filterExpensesInRange(
  expenses: ExpenseInput[],
  start?: Date,
  end?: Date
): ExpenseInput[] {
  if (!start && !end) return expenses
  return expenses.filter((r) => {
    if (start && r.date < start) return false
    if (end && r.date > end) return false
    return true
  })
}

export function sessionHours(sessions: SessionInput[]): number {
  let total = 0
  for (const s of sessions) {
    if (!s.endedAt) continue
    const ms = s.endedAt.getTime() - s.startedAt.getTime()
    if (ms > 0) total += ms / 3_600_000
  }
  return Math.round(total * 100) / 100
}

/**
 * Core profit summary per spec §9. `hours` comes from recorded sessions ONLY
 * (when none exist we return 0 and null rates rather than guessing).
 */
export function computePeriod(input: ComputePeriodInput): PeriodSummary {
  const income = filterIncomeInRange(input.income, input.startDate, input.endDate)
  const expenses = filterExpensesInRange(input.expenses, input.startDate, input.endDate)
  const sessions = input.sessions ?? []
  const settled = sessions.filter((s) => s.endedAt)

  const incomeTotal = money(sum(income.map((r) => r.amount)))
  const expensesTotal = money(sum(expenses.map((r) => r.amount)))
  const net = money(incomeTotal - expensesTotal)
  const hours = sessionHours(sessions)
  const minutes = money(sessionHours(settled) * 60)
  const trips = sum(income.map((r) => r.tripCount ?? 0))

  const profitPerHour = hours > EPS ? money(net / hours) : null
  const distance = input.distanceKm != null && input.distanceKm > 0 ? input.distanceKm : null
  const profitPerKm = distance ? money(net / distance) : null
  const expensePerKm = distance ? money(expensesTotal / distance) : null
  const tripIncome = income.length > 0 ? income : null
  const avgTripValue = tripIncome && income.length > 0 ? money(incomeTotal / income.length) : null

  return {
    income: incomeTotal,
    expenses: expensesTotal,
    netProfit: net,
    hours,
    minutes,
    trips,
    profitPerHour,
    profitPerKm,
    expensePerKm,
    avgTripValue,
  }
}

/**
 * Expense coverage: share of active days that also have an expense record.
 * Low coverage triggers the "profit is approximate" honesty banner (spec §9).
 */
export function expenseCoverageRatio(
  income: IncomeInput[],
  expenses: ExpenseInput[],
  sessions: SessionInput[] = []
): number {
  const activeDays = new Set<string>()
  for (const r of income) activeDays.add(startOfDay(r.date).toISOString().slice(0, 10))
  for (const s of sessions) activeDays.add(startOfDay(s.startedAt).toISOString().slice(0, 10))
  if (activeDays.size === 0) return 1 // nothing to judge -> no warning

  const coveredDays = new Set<string>()
  for (const e of expenses) coveredDays.add(startOfDay(e.date).toISOString().slice(0, 10))
  let covered = 0
  for (const d of activeDays) if (coveredDays.has(d)) covered++
  return covered / activeDays.size
}

export function expensesAreIncomplete(coverage: number, threshold = 0.7): boolean {
  return coverage < threshold
}

// ==================== Trend change (for the Δ% on dashboard) ====================

/** Percentage change vs previous equivalent window. Returns null when previous is empty. */
export function trendChangePct(current: number, previous: number): number | null {
  if (Math.abs(previous) < EPS) return null
  return money(((current - previous) / Math.abs(previous)) * 1000) / 10
}

// ==================== Series for charts ====================

function dayKey(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10)
}

function ensureDay(map: Map<string, DayPoint>, key: string): DayPoint {
  let p = map.get(key)
  if (!p) {
    p = { date: key, label: key, income: 0, expenses: 0, net: 0, hours: 0, trips: 0 }
    map.set(key, p)
  }
  return p
}

/** Fill missing days between first and last date so charts are continuous. */
function fillGaps(map: Map<string, DayPoint>): DayPoint[] {
  if (map.size === 0) return []
  const keys = [...map.keys()].sort()
  const first = new Date(keys[0]!)
  const last = new Date(keys[keys.length - 1]!)
  const out: DayPoint[] = []
  for (let t = first.getTime(); t <= last.getTime(); t += DAY_MS) {
    const d = new Date(t)
    out.push(ensureDay(map, dayKey(d)))
  }
  return out
}

export interface SeriesOptions {
  startDate?: Date
  endDate?: Date
}

export function buildDailySeries(
  income: IncomeInput[],
  expenses: ExpenseInput[],
  sessions: SessionInput[] = [],
  opts: SeriesOptions = {}
): DayPoint[] {
  const map = new Map<string, DayPoint>()
  for (const r of income) {
    const p = ensureDay(map, dayKey(r.date))
    p.income = money(p.income + r.amount)
    p.trips += r.tripCount ?? 0
  }
  for (const e of expenses) {
    const p = ensureDay(map, dayKey(e.date))
    p.expenses = money(p.expenses + e.amount)
  }
  for (const s of sessions) {
    if (!s.endedAt) continue
    const p = ensureDay(map, dayKey(s.startedAt))
    p.hours = money((p.hours + (s.endedAt.getTime() - s.startedAt.getTime()) / 3_600_000) * 100) / 100
  }
  for (const p of map.values()) p.net = money(p.income - p.expenses)
  let days = fillGaps(map)
  if (opts.startDate) days = days.filter((d) => d.date >= dayKey(opts.startDate!))
  if (opts.endDate) days = days.filter((d) => d.date <= dayKey(opts.endDate!))
  return days
}

export interface WeekPoint {
  weekStart: string // yyyy-mm-dd of Monday
  label: string
  income: number
  expenses: number
  net: number
  hours: number
  trips: number
}

/** ISO weekday grouping (Mon..Sun). Returns weeks ordered oldest -> newest. */
export function buildWeeklySeries(
  income: IncomeInput[],
  expenses: ExpenseInput[],
  sessions: SessionInput[] = []
): WeekPoint[] {
  const map = new Map<string, WeekPoint>()
  const weekOf = (d: Date) => {
    const day = startOfDay(d)
    const dow = (day.getDay() + 6) % 7 // Mon=0
    const monday = new Date(day.getTime() - dow * DAY_MS)
    return monday.toISOString().slice(0, 10)
  }
  const ensure = (k: string): WeekPoint => {
    let w = map.get(k)
    if (!w) {
      w = { weekStart: k, label: k, income: 0, expenses: 0, net: 0, hours: 0, trips: 0 }
      map.set(k, w)
    }
    return w
  }
  for (const r of income) {
    const w = ensure(weekOf(r.date))
    w.income = money(w.income + r.amount)
    w.trips += r.tripCount ?? 0
  }
  for (const e of expenses) {
    const w = ensure(weekOf(e.date))
    w.expenses = money(w.expenses + e.amount)
  }
  for (const s of sessions) {
    if (!s.endedAt) continue
    const w = ensure(weekOf(s.startedAt))
    w.hours = money((w.hours + (s.endedAt.getTime() - s.startedAt.getTime()) / 3_600_000) * 100) / 100
  }
  for (const w of map.values()) w.net = money(w.income - w.expenses)
  return [...map.values()].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
}

// ==================== Insights (spec §14) ====================

const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

export function formatDateLabel(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`
}

export interface InsightsInput {
  income: IncomeInput[]
  expenses: ExpenseInput[]
  sessions?: SessionInput[]
  startDate?: Date
  endDate?: Date
  /** Minimum data points before insights unlock (spec §14: only show with sufficient data). */
  minDays?: number
  distanceKm?: number | null
}

export function computeInsights(input: InsightsInput): MoneyInsight[] {
  const start = input.startDate ?? new Date(Date.now() - 29 * DAY_MS)
  const end = input.endDate ?? new Date()
  const income = filterIncomeInRange(input.income, start, end)
  const expenses = filterExpensesInRange(input.expenses, start, end)
  const sessions = input.sessions ?? []

  const activeDays = new Set<string>([
    ...income.map((r) => dayKey(r.date)),
    ...expenses.map((e) => dayKey(e.date)),
  ])
  const minDays = input.minDays ?? 5
  if (activeDays.size < minDays) return []

  const insights: MoneyInsight[] = []
  const fmt = (n: number) => `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} so‘m`

  // best_day by net profit
  const byDay = new Map<string, number>()
  for (const r of income) {
    const k = dayKey(r.date)
    byDay.set(k, money((byDay.get(k) ?? 0) + r.amount))
  }
  for (const e of expenses) {
    const k = dayKey(e.date)
    byDay.set(k, money((byDay.get(k) ?? 0) - e.amount))
  }
  let bestDay: [string, number] | null = null
  for (const [k, v] of byDay) {
    if (!bestDay || v > bestDay[1]) bestDay = [k, v]
  }
  if (bestDay) {
    insights.push({
      type: 'best_day',
      label: 'Eng foydali kun',
      value: formatDateLabel(new Date(bestDay[0] + 'T00:00:00')),
      detail: `Sof foyda ${fmt(bestDay[1])}`,
    })
  }

  // best_time by hour bucket (income)
  const byHour = new Map<number, { total: number; count: number }>()
  for (const r of income) {
    const h = r.date.getHours()
    const cur = byHour.get(h) ?? { total: 0, count: 0 }
    cur.total = money(cur.total + r.amount)
    cur.count += 1
    byHour.set(h, cur)
  }
  let bestHour: [number, number] | null = null
  for (const [h, v] of byHour) {
    const avg = v.count > 0 ? v.total / v.count : 0
    if (!bestHour || avg > bestHour[1]) bestHour = [h, avg]
  }
  if (bestHour && income.length >= 10) {
    const h = bestHour[0]
    const fmtHour = `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`
    insights.push({
      type: 'best_time',
      label: 'Eng foydali vaqt',
      value: fmtHour,
      detail: `O‘rtacha bitta kirim ${fmt(bestHour[1])}`,
    })
  }

  // biggest_expense
  if (expenses.length > 0) {
    const biggest = expenses.reduce((a, b) => (b.amount > a.amount ? b : a))
    insights.push({
      type: 'biggest_expense',
      label: 'Eng katta xarajat',
      value: fmt(biggest.amount),
      detail: biggest.category ? `Kategoriya: ${biggest.category}` : undefined,
    })
  }

  // best_week by net
  const weeks = buildWeeklySeries(income, expenses, sessions)
  if (weeks.length >= 2) {
    const best = weeks.reduce((a, b) => (b.net > a.net ? b : a))
    insights.push({
      type: 'best_week',
      label: 'Eng samarali hafta',
      value: `Hafta ${weeks.length - weeks.indexOf(best)}-chi (eng so‘nggi)`,
      detail: `Sof foyda ${fmt(best.net)}`,
    })
  }

  // expense_growth: current week vs previous week
  if (weeks.length >= 2) {
    const cur = weeks[weeks.length - 1]!
    const prev = weeks[weeks.length - 2]!
    if (Math.abs(prev.expenses) > EPS) {
      const pct = trendChangePct(cur.expenses, prev.expenses)
      if (pct !== null) {
        insights.push({
          type: 'expense_growth',
          label: 'Xarajatlar o‘zgarishi',
          value: `${pct > 0 ? '+' : ''}${pct}%`,
          detail: 'So‘nggi hafta oldingisiga nisbatan',
        })
      }
    }
  }

  // avg_profit per hour
  const hours = sessionHours(sessions)
  const netTotal = money(
    sum(income.map((r) => r.amount)) - sum(expenses.map((e) => e.amount))
  )
  if (hours > 1) {
    insights.push({
      type: 'avg_profit',
      label: 'Soatlik sof foyda',
      value: fmt(netTotal / hours),
      detail: `${hours} soatlik ish davomida`,
    })
  }

  return insights
}

// ==================== Streak / consistency ====================

/** Consecutive days with ≥1 income or expense record, up to `now`. */
export function computeStreak(income: IncomeInput[], expenses: ExpenseInput[], now = new Date()): number {
  const days = new Set<string>([
    ...income.map((r) => dayKey(r.date)),
    ...expenses.map((e) => dayKey(e.date)),
  ])
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(now.getTime() - i * DAY_MS)
    if (days.has(dayKey(d))) streak++
    else if (i > 0) break // today may lag behind, allow it to start the streak
    else if (i === 0) continue
    else break
  }
  return streak
}

/** Days with at least one activity record within the last `windowDays`. */
export function trackedDays(income: IncomeInput[], expenses: ExpenseInput[], sessions: SessionInput[] = []): number {
  const days = new Set<string>()
  for (const r of income) days.add(dayKey(r.date))
  for (const e of expenses) days.add(dayKey(e.date))
  for (const s of sessions) days.add(dayKey(s.startedAt))
  return days.size
}

// ==================== Money table (used by AI Coach + chat) ====================

export interface MoneyTable {
  hourlyNet: number | null
  avgIncomePerDay: number | null
  avgExpensePerDay: number | null
  dailyNet: number | null
  tripsPerDay: number | null
  avgTripIncome: number | null
  fuelShare: number | null
}

export function computeMoneyTable(
  income: IncomeInput[],
  expenses: ExpenseInput[],
  sessions: SessionInput[] = [],
  now = new Date()
): MoneyTable {
  const window = new Date(now.getTime() - 29 * DAY_MS)
  const inc = filterIncomeInRange(income, window, now)
  const exp = filterExpensesInRange(expenses, window, now)
  const activeDays = new Set([...inc.map((r) => dayKey(r.date)), ...exp.map((e) => dayKey(e.date))]).size || 1
  const daysInWindow = 30

  const incomeTotal = sum(inc.map((r) => r.amount))
  const expenseTotal = sum(exp.map((e) => e.amount))
  const net = incomeTotal - expenseTotal
  const hours = sessionHours(sessions)
  const fuel = exp.filter((e) => e.category === 'FUEL')
  const fuelTotal = sum(fuel.map((e) => e.amount))

  return {
    hourlyNet: hours > EPS ? money(net / hours) : null,
    avgIncomePerDay: money(incomeTotal / daysInWindow),
    avgExpensePerDay: money(expenseTotal / daysInWindow),
    dailyNet: money(net / daysInWindow),
    tripsPerDay: activeDays > 0 ? sum(inc.map((r) => r.tripCount ?? 0)) / activeDays : null,
    avgTripIncome: inc.length > 0 ? money(incomeTotal / inc.length) : null,
    fuelShare: expenseTotal > EPS ? money((fuelTotal / expenseTotal) * 100) : null,
  }
}