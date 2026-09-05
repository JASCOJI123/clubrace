export type UserRole = 'DRIVER' | 'PARTNER' | 'MODERATOR' | 'ADMIN'

export interface DriverAppUser {
  id: string
  role: UserRole
  name: string | null
  phone: string | null
  telegramId: string | null // stringified BigInt for JSON safety
  referralCode: string | null
  onboardingDone: boolean
  isSuspended: boolean
  isBanned: boolean
  isDemo: boolean
  settings: Record<string, unknown> | null
}

export interface DashboardSummary {
  date: string
  income: number
  expenses: number
  netProfit: number
  hours: number
  minutes: number
  trips: number
  profitPerHour: number
  incomeChangePct: number
  expensesIncomplete: boolean // true when expense coverage is too low -> "profit approximate"
  workStarted: boolean
}

export interface GoalProgress {
  goalId: string
  title: string
  emoji: string
  targetAmount: number
  savedAmount: number
  progressPct: number
  dailyTarget: number
  onPace: boolean | null // null when not enough data
  deadlineDaysLeft: number | null
}

export interface MoneyInsight {
  type: 'best_day' | 'best_time' | 'biggest_expense' | 'best_week' | 'expense_growth' | 'income_trend'
  label: string
  value: string
  detail?: string
}

export interface WeeklyStats {
  weekStart: string
  weekEnd: string
  income: number
  expenses: number
  netProfit: number
  hours: number
  trips: number
  profitPerHour: number
}

export interface DriverScoreDetails {
  score: number
  components: Record<string, number | null>
  weights: Record<string, number>
  computedAt: string
}

export interface AICoachPlan {
  goalAmount: number
  avgHourlyNet: number
  estHoursNeeded: number
  todayProgress: number
  remaining: number
  onTrack: boolean
  isEstimate: boolean
}

export interface AIResponse {
  answer: string
  facts: { FACT: string[]; ESTIMATE: string[]; RECOMMENDATION: string[] }
  usedProvider: 'deterministic' | 'anthropic'
}

export interface ShareableWeekCard {
  title: string
  income: number
  expenses: number
  net: number
  hours: string
  score: number | null
}

export interface DashboardPayload extends DashboardSummary {
  goal: GoalProgress | null
  driverScore: number | null
  carStatus: CarStatusCard | null
  aiRecommendation: string | null
  activeChallenges: { id: string; name: string; endDate: string }[]
  clubOffers: { id: string; title: string; discountText: string | null; partnerName: string }[]
  vehicles: CarSummary[]
}

export interface CarSummary {
  id: string
  brand: string
  model: string
  mileageKms: number
  fuelType: string
  plate: string | null
}

export interface CarStatusCard extends CarSummary {
  statuses: { label: string; level: 'ok' | 'warn' | 'overdue' }[]
}

export interface MaintenanceItem {
  id: string
  serviceType: string
  cost: number
  date: string
  nextDueDate: string | null
  nextDueMileage: number | null
  provider: string | null
  status: 'ok' | 'warn' | 'overdue' | 'none'
}

export interface CarCostAnalytics {
  totalMaintenanceCost: number
  maintenanceCostPerMonth: number
  maintenanceCostPerKm: number
  fuelCostPerKm: number
  totalVehicleCostPerKm: number
  monthsCovered: number
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  score: number | null
  resultValue: number | null
  isMe: boolean
}

export interface PartnerDashboardStats {
  views: number
  clicks: number
  leads: number
  conversions: number
  revenue: number
  offerCount: number
}