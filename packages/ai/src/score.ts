import { expenseCoverageRatio, money, trackedDays } from './analytics.js'
import type { ExpenseInput, IncomeInput, SessionInput } from './types.js'

/**
 * Driver Score (spec §18) — completely transparent scoring rules.
 * Each component 0-100. Missing options (e.g. no customer rating yet) are simply
 * excluded and the remaining weights re-normalized — no fake numbers.
 */

export interface ScoreInput {
  income: IncomeInput[]
  expenses: ExpenseInput[]
  sessions: SessionInput[]
  hasCar: boolean
  maintenanceEvents30d: number
  maintenanceEvents180d: number
  completedGoals: number
  activeGoals: number
  goalProgress: number // 0..1 for active goals
  achievementsCount: number
  referralsActive: number
  challengesJoined: number
  clubClaims: number
  customerRating?: number | null // 1..5
  trackedWindowDays?: number // default 30
}

export interface ScoreResult {
  score: number // 0..100
  components: Record<string, number | null>
  weights: Record<string, number>
}

export const DEFAULT_WEIGHTS = {
  financialDiscipline: 25,
  consistency: 20,
  vehicleMaintenance: 15,
  goalCompletion: 15,
  communityActivity: 10,
  customerRating: 15,
} as const

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function financialDiscipline(input: ScoreInput): number {
  const coverage = expenseCoverageRatio(input.income, input.expenses, input.sessions)
  // 100 at >=90% coverage; 0 at <=40%, linear in between
  return money(clamp01((coverage - 0.4) / 0.5) * 100)
}

function consistency(input: ScoreInput, windowDays: number): number {
  const tracked = trackedDays(input.income, input.expenses, input.sessions)
  return money(clamp01(tracked / windowDays) * 100)
}

function vehicleMaintenance(input: ScoreInput): number {
  if (!input.hasCar) return 0
  const recent = clamp01(input.maintenanceEvents30d / 2)
  const overall = clamp01(input.maintenanceEvents180d / 10)
  return money((recent * 0.4 + overall * 0.6) * 100)
}

function goalCompletion(input: ScoreInput): number {
  const total = input.completedGoals + input.activeGoals
  if (total === 0) return 0
  const completedShare = input.completedGoals / total
  const progressShare = input.activeGoals > 0 ? clamp01(input.goalProgress) : 0
  return money(clamp01((completedShare * 0.6 + progressShare * 0.4)) * 100)
}

function communityActivity(input: ScoreInput): number {
  const points =
    input.achievementsCount * 6 +
    input.referralsActive * 5 +
    input.challengesJoined * 4 +
    input.clubClaims * 3
  return money(clamp01(points / 30) * 100)
}

function customerRatingScore(input: ScoreInput): number | null {
  if (input.customerRating == null) return null
  return money(clamp01(input.customerRating / 5) * 100)
}

export function computeDriverScore(input: ScoreInput): ScoreResult {
  const windowDays = input.trackedWindowDays ?? 30
  const components = {
    financialDiscipline: financialDiscipline(input),
    consistency: consistency(input, windowDays),
    vehicleMaintenance: vehicleMaintenance(input),
    goalCompletion: goalCompletion(input),
    communityActivity: communityActivity(input),
    customerRating: customerRatingScore(input),
  }

  // Re-normalize weights over present components
  let totalWeight = 0
  const weights: Record<string, number> = {}
  for (const [k, w] of Object.entries(DEFAULT_WEIGHTS)) {
    const c = components[k as keyof typeof components]
    if (c === null) continue
    weights[k] = w
    totalWeight += w
  }
  if (totalWeight === 0) return { score: 0, components, weights: DEFAULT_WEIGHTS }

  let acc = 0
  for (const [k, w] of Object.entries(weights)) {
    acc += ((components[k as keyof typeof components] ?? 0) / 100) * w
  }
  const score = money((acc / totalWeight) * 100)
  return { score, components, weights }
}