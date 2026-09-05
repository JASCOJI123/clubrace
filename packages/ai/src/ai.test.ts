import { describe, expect, it } from 'vitest'
import {
  buildDailySeries,
  buildWeeklySeries,
  computeDriverScore,
  computeInsights,
  computePeriod,
  computeStreak,
  expenseCoverageRatio,
  expensesAreIncomplete,
  trendChangePct,
  levelForXp,
  xpProgressPct,
  buildCoachPlan,
} from './index.js'

const d = (day: number, hour = 12) => {
  const date = new Date(2026, 8, 5) // 2026-09-05
  date.setDate(date.getDate() - day)
  date.setHours(hour, 0, 0, 0)
  return date
}

describe('computePeriod (spec §9 profit math, deterministic)', () => {
  it('computes net profit = income - expenses', () => {
    const income = [{ amount: 420_000, date: d(0) }, { amount: 180_000, date: d(0) }]
    const expenses = [{ amount: 133_000, date: d(0) }]
    const s = computePeriod({ income, expenses })
    expect(s.netProfit).toBe(467_000)
    expect(s.income).toBe(600_000)
    expect(s.expenses).toBe(133_000)
  })

  it('profitPerHour is null when no completed sessions (never guesses)', () => {
    const s = computePeriod({ income: [{ amount: 100_000, date: d(0) }], expenses: [] })
    expect(s.profitPerHour).toBeNull()
    expect(s.hours).toBe(0)
  })

  it('profitPerHour from session duration', () => {
    const s = computePeriod({
      income: [{ amount: 340_000, date: d(0) }],
      expenses: [{ amount: 40_000, date: d(0) }],
      sessions: [{ startedAt: d(0, 8), endedAt: new Date(d(0, 8).getTime() + 6 * 3_600_000) }],
    })
    expect(s.netProfit).toBe(300_000)
    expect(s.profitPerHour).toBe(50_000)
    expect(s.hours).toBe(6)
  })

  it('profitPerKm requires distance', () => {
    const withKm = computePeriod({ income: [{ amount: 300_000, date: d(0) }], expenses: [], distanceKm: 150 })
    expect(withKm.profitPerKm).toBe(2000)
    const noKm = computePeriod({ income: [{ amount: 300_000, date: d(0) }], expenses: [] })
    expect(noKm.profitPerKm).toBeNull()
  })

  it('trip totals sum and avg trip value divides', () => {
    const s = computePeriod({
      income: [
        { amount: 120_000, date: d(0), tripCount: 12 },
        { amount: 180_000, date: d(0), tripCount: 18 },
      ],
      expenses: [],
    })
    expect(s.trips).toBe(30)
    expect(s.avgTripValue).toBe(150_000)
  })
})

describe('expense coverage honesty (spec §9 banner)', () => {
  it('flags low coverage', () => {
    const income = [1, 2, 3, 4].map((i) => ({ amount: 100_000, date: d(i) }))
    const expenses = [{ amount: 20_000, date: d(2) }]
    const coverage = expenseCoverageRatio(income, expenses)
    expect(expensesAreIncomplete(coverage)).toBe(true)
    expect(coverage).toBeCloseTo(0.25)
  })

  it('no flag when all active days covered', () => {
    const income = [{ amount: 100_000, date: d(0) }]
    const expenses = [{ amount: 20_000, date: d(0) }]
    expect(expensesAreIncomplete(expenseCoverageRatio(income, expenses))).toBe(false)
  })
})

describe('trendChangePct', () => {
  it('computes % change', () => {
    expect(trendChangePct(420_000, 374_000)).toBeCloseTo(12.3)
  })
  it('null when previous empty (no fake 0 change)', () => {
    expect(trendChangePct(420_000, 0)).toBeNull()
  })
})

describe('series builders', () => {
  it('buildDailySeries fills gaps with zero days', () => {
    const income = [{ amount: 100_000, date: d(5) }, { amount: 200_000, date: d(2) }]
    const series = buildDailySeries(income, [])
    expect(series.length).toBeGreaterThanOrEqual(4)
    const gap = series.find((p) => p.income === 0 && p.expenses === 0)
    expect(gap).toBeDefined()
    expect(series[series.length - 1]!.net).toBe(0)
  })

  it('buildWeeklySeries groups Monday-first weeks', () => {
    const income = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ amount: 70_000, date: d(i) }))
    const weeks = buildWeeklySeries(income, [])
    expect(weeks.length).toBe(2)
    const total = weeks.reduce((a, w) => a + w.income, 0)
    expect(total).toBe(560_000) // 8 * 70_000, all preserved across buckets
    expect(weeks[0]!.weekStart < weeks[1]!.weekStart).toBe(true) // ISO string sorts chronologically
  })
})

describe('computeInsights', () => {
  it('returns [] with insufficient data (spec §14)', () => {
    const income = [{ amount: 100_000, date: d(0) }]
    expect(computeInsights({ income, expenses: [], minDays: 5 })).toEqual([])
  })

  it('finds biggest expense', () => {
    const expenses = [
      { amount: 50_000, date: d(2), category: 'FUEL' },
      { amount: 900_000, date: d(2), category: 'REPAIR' },
    ]
    const income = [1, 2, 3, 4, 5, 6, 7].map((i) => ({ amount: 100_000, date: d(i) }))
    const insights = computeInsights({ income, expenses })
    const biggest = insights.find((i) => i.type === 'biggest_expense')
    expect(biggest).toBeDefined()
    expect(biggest!.value).toContain('900 000')
  })
})

describe('Driver Score transparency (spec §18)', () => {
  const mkIncome = (n: number) => Array.from({ length: n }, (_, i) => ({ amount: 100_000, date: d(i % 12) }))
  const mkExpense = (n: number) => Array.from({ length: n }, (_, i) => ({ amount: 10_000, date: d(i % 12) }))

  it('score in 0..100 with weights that sum corrected when rating missing', () => {
    const r = computeDriverScore({
      income: mkIncome(28),
      expenses: mkExpense(28),
      sessions: [],
      hasCar: true,
      maintenanceEvents30d: 1,
      maintenanceEvents180d: 5,
      completedGoals: 1,
      activeGoals: 1,
      goalProgress: 0.5,
      achievementsCount: 2,
      referralsActive: 1,
      challengesJoined: 1,
      clubClaims: 1,
      customerRating: null,
    })
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
    expect(r.weights.customerRating).toBeUndefined()
    const total = Object.values(r.weights).reduce((a, b) => a + b, 0)
    expect(total).toBe(85) // 100 - 15
    expect(r.components.customerRating).toBeNull()
  })

  it('higher data quality => higher score', () => {
    const good = computeDriverScore({
      income: mkIncome(30),
      expenses: mkExpense(30),
      sessions: [],
      hasCar: true,
      maintenanceEvents30d: 2,
      maintenanceEvents180d: 8,
      completedGoals: 2,
      activeGoals: 0,
      goalProgress: 1,
      achievementsCount: 3,
      referralsActive: 2,
      challengesJoined: 2,
      clubClaims: 2,
      customerRating: 5,
    })
    const poor = computeDriverScore({
      income: mkIncome(3),
      expenses: [],
      sessions: [],
      hasCar: false,
      maintenanceEvents30d: 0,
      maintenanceEvents180d: 0,
      completedGoals: 0,
      activeGoals: 0,
      goalProgress: 0,
      achievementsCount: 0,
      referralsActive: 0,
      challengesJoined: 0,
      clubClaims: 0,
      customerRating: null,
    })
    expect(good.score).toBeGreaterThan(poor.score)
  })
})

describe('Levels & XP (spec §19)', () => {
  it('maps XP to levels and progress', () => {
    expect(levelForXp(0)).toBe('ROOKIE')
    expect(levelForXp(200)).toBe('ACTIVE')
    expect(levelForXp(599)).toBe('ACTIVE')
    expect(levelForXp(600)).toBe('PRO')
    expect(levelForXp(1500)).toBe('ELITE')
    expect(xpProgressPct(300)).toBeGreaterThan(0)
    expect(xpProgressPct(190)).toBe(95)
  })
})

describe('AI Coach plan (spec §12)', () => {
  it('computes hours needed estimate', () => {
    const ctx = {
      avgHourlyNet: 34_000,
      avgDailyProfit: 253_333,
      income30d: 9_000_000,
      expenses30d: 0,
      netProfit30d: 9_000_000,
      goalProgress: 0.7,
      daysTracked30: 30,
      expenseCoverage: 90,
      workHours30d: 260,
      trips30d: 400,
      avgTripValue: 22_500,
      biggestExpense30d: null,
      bestDay30d: '2026-08-20',
      bestWeekNet: 2_000_000,
      fuelShareOfExpenses30d: null,
      maintenanceCost30d: 0,
      vehicleKm: null,
      level: 'PRO',
      streakDays: 30,
    }
    const p = buildCoachPlan({ goalAmount: 400_000, ctx, todayIncome: 287_000, todayExpenses: 0 })
    expect(p.remaining).toBe(113_000)
    expect(p.estHoursNeeded).toBeCloseTo(3.3) // 113000/34000 ≈ 3.32
    expect(p.canEstimate).toBe(true)
    expect(p.onTrack).toBe(false)
  })

  it('never estimates when hourly net unknown', () => {
    const ctx = {
      avgHourlyNet: null,
      avgDailyProfit: 0,
      income30d: 0,
      expenses30d: 0,
      netProfit30d: 0,
      goalProgress: null,
      daysTracked30: 0,
      expenseCoverage: 100,
      workHours30d: 0,
      trips30d: 0,
      avgTripValue: null,
      biggestExpense30d: null,
      bestDay30d: null,
      bestWeekNet: null,
      fuelShareOfExpenses30d: null,
      maintenanceCost30d: 0,
      vehicleKm: null,
      level: 'ROOKIE',
      streakDays: 0,
    }
    const p = buildCoachPlan({ goalAmount: 400_000, ctx })
    expect(p.canEstimate).toBe(false)
    expect(p.estHoursNeeded).toBeNull()
  })
})

describe('computeStreak', () => {
  it('counts consecutive days ending today or yesterday', () => {
    const income = [0, 1, 2].map((i) => ({ amount: 100_000, date: d(i) }))
    expect(computeStreak(income, [], new Date(2026, 8, 5, 12))).toBe(3)
  })
  it('breaks when a day gap exists', () => {
    const income = [{ amount: 100_000, date: d(0) }, { amount: 100_000, date: d(2) }]
    expect(computeStreak(income, [], new Date(2026, 8, 5, 12))).toBe(1)
  })
})