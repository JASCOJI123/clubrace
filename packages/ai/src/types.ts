export interface IncomeInput {
  amount: number
  date: Date
  platform?: string
  tripCount?: number | null
}

export interface ExpenseInput {
  amount: number
  date: Date
  category?: string
}

export interface SessionInput {
  startedAt: Date
  endedAt?: Date | null
}

export interface DayPoint {
  date: string // yyyy-mm-dd
  label: string
  income: number
  expenses: number
  net: number
  hours: number
  trips: number
}

export interface PeriodSummary {
  income: number
  expenses: number
  netProfit: number
  hours: number
  minutes: number
  trips: number
  profitPerHour: number | null // null when no settled sessions
  profitPerKm: number | null // null when distance unknown
  expensePerKm: number | null
  avgTripValue: number | null
}

export interface MoneyInsight {
  type:
    | 'best_day'
    | 'best_time'
    | 'biggest_expense'
    | 'best_week'
    | 'expense_growth'
    | 'income_trend'
    | 'avg_profit'
  label: string
  value: string
  detail?: string
}

export interface DriverContext {
  income30d: number
  expenses30d: number
  netProfit30d: number
  avgDailyProfit: number
  avgHourlyNet: number | null
  goalProgress: number | null
  daysTracked30: number
  expenseCoverage: number
  workHours30d: number
  trips30d: number
  avgTripValue: number | null
  biggestExpense30d: { amount: number; category: string } | null
  bestDay30d: string | null
  bestWeekNet: number | null
  fuelShareOfExpenses30d: number | null
  maintenanceCost30d: number | null
  vehicleKm: number | null
  level: string
  streakDays: number
}

export type ChatProvider = 'deterministic' | 'anthropic'