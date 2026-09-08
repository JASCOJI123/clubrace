/**
 * Mini App API client — thin typed wrapper over the Fastify REST API.
 * Base URL is /api (proxied to the API server in dev; same origin in prod via
 * a reverse proxy). Auth: JWT in localStorage; sent as Authorization header.
 * Every method is honest about errors: non-2xx throws ApiClientError.
 */

let token: string | null = null

export function setToken(t: string | null): void {
  token = t
  if (t) localStorage.setItem('dh_token', t)
  else localStorage.removeItem('dh_token')
}

export function getToken(): string | null {
  if (token === null) {
    token = localStorage.getItem('dh_token')
  }
  return token
}

export class ApiClientError extends Error {
  status: number
  code?: string
  details?: unknown
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = getToken()
  const headers: Record<string, string> = {
    ...(opts.body !== undefined && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...(opts.headers as Record<string, string> | undefined),
  }
  const res = await fetch(`/api${path}`, { ...opts, headers })
  if (!res.ok) {
    let body: { message?: string; code?: string; details?: unknown } = {}
    try {
      body = (await res.json()) as typeof body
    } catch {
      /* no body */
    }
    throw new ApiClientError(res.status, body.message ?? `Xatolik (${res.status})`, body.code, body.details)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) })
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })

/** Upload a receipt / photo multipart (used by expenses & marketplace listings). */
export function uploadForm(path: string, form: FormData): Promise<{ url: string }> {
  return request<{ url: string }>(path, { method: 'POST', body: form })
}

/* ============================== domain types ============================== */

export type UserRole = 'DRIVER' | 'PARTNER' | 'MODERATOR' | 'ADMIN'

export interface PublicUser {
  id: string
  role: UserRole
  name: string | null
  phone: string | null
  telegramId: string | null
  referralCode: string | null
  onboardingDone: boolean
  isSuspended: boolean
  isBanned: boolean
  isDemo: boolean
  settings: unknown
  avatarUrl: string | null
  driverType: string | null
}

export interface DriverProfile {
  id: string
  userId: string
  driverType: string | null
  incomeTargetMonth: number | null
  primaryGoal: string | null
  level: string
  xp: number
  privacy?: {
    showInLeaderboard?: boolean
    shareWeekly?: boolean
  }
}

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
  isDemo: boolean
  profile: PublicUser
}

export type IncomePlatform = 'YANDEX' | 'UBER' | 'INDRIVE' | 'PRIVATE' | 'DELIVERY' | 'OTHER'
export type ExpenseCategory =
  | 'FUEL'
  | 'GAS'
  | 'OIL'
  | 'REPAIR'
  | 'TIRES'
  | 'PARKING'
  | 'CAR_WASH'
  | 'INSURANCE'
  | 'TAX'
  | 'LOAN'
  | 'OTHER'

export interface IncomeRecord {
  id: string
  userId: string
  amount: number
  date: string
  platform: IncomePlatform
  tripCount: number | null
  carId: string | null
  workSessionId: string | null
  notes: string | null
}

export interface ExpenseRecord {
  id: string
  userId: string
  amount: number
  date: string
  category: ExpenseCategory
  carId: string | null
  workSessionId: string | null
  receiptUrl: string | null
  notes: string | null
}

export interface WorkSession {
  id: string
  userId: string
  startedAt: string
  endedAt: string | null
  status: 'ACTIVE' | 'ENDED'
  income?: number
  expenses?: number
  durationMinutes?: number
}

export interface Goal {
  id: string
  userId: string
  title: string
  targetAmount: number
  deadline: string | null
  emoji: string
  status: 'ACTIVE' | 'COMPLETED' | 'ACTIVE'
  createdAt: string
}

export interface Car {
  id: string
  userId: string
  brand: string
  model: string
  year: number | null
  plate: string | null
  fuelType: string
  mileageKms: number
  isPrimary: boolean
}

export interface MaintenanceRecord {
  id: string
  carId: string
  serviceType: string
  date: string
  cost: number
  mileageKms: number | null
  nextDueDate: string | null
  notes: string | null
}

export interface DayPoint {
  date: string
  label: string
  income: number
  expenses: number
  net: number
  hours: number
  trips: number
}

export interface WeekPoint {
  weekStart: string
  label: string
  income: number
  expenses: number
  net: number
  hours: number
  trips: number
}

export interface MoneyInsight {
  type: string
  label: string
  value: string
  detail?: string
}

/** Summary values come from the server pre-formatted as "1 250 000 so'm". */
export interface AnalyticsOutput {
  summary: {
    income: string
    expenses: string
    netProfit: string
    hours: number
    minutes: string
    trips: number
    profitPerHour: string | null
    profitPerKm: string | null
    expensePerKm: string | null
    avgTripValue: string | null
  }
  daily: DayPoint[]
  weekly: WeekPoint[]
  insights: MoneyInsight[]
  coverage: number
}

export interface AIResponse {
  answer: string
  facts: { FACT: string[]; ESTIMATE: string[]; RECOMMENDATION: string[] }
  usedProvider: 'anthropic' | 'deterministic'
}

export interface CoachPlan {
  canEstimate: boolean
  // rendered server-side via `formatted` for deterministic engine
  formatted?: string
}

export interface CarCost {
  totalMaintenanceCost: number
  maintenanceCostPerMonth: number
  maintenanceCostPerKm: number | null
  fuelCostPerKm: number | null
  totalVehicleCostPerKm: number | null
  monthsCovered: number
}

export interface NotificationPrefs {
  telegramEnabled: boolean | null
  quietHoursStart: number | null
  quietHoursEnd: number | null
  enabled: Record<string, boolean> | null
}

export interface ScoreResponse {
  score: number | null
  components: { label?: string; score?: number }[] | null
  level: string
  xp: number
  computedAt: string | null
}

export interface ShareWeek {
  title: string
  income: number
  expenses: number
  net: number
  hours: string
  score: number | null
}

export interface AIStats {
  income30d: number | null
  expenses30d: number | null
  netProfit30d: number | null
  avgHourlyNet: number | null
  daysTracked30: number
  expenseCoverage: number | null
  fuelShareOfExpenses30d: number | null
}

/* ================================ auth =================================== */

export const authApi = {
  telegram(initData: string) {
    return post<{ token: string; user: PublicUser }>('/auth/telegram', { initData })
  },
  devLogin(demoUserId?: string, role?: UserRole) {
    return post<{ token: string; user: PublicUser }>('/auth/dev-login', { demoUserId, role })
  },
  whoami() {
    return get<PublicUser & { driver?: DriverProfile; score?: number | null }>('/auth/whoami')
  },
}

/* ================================= me ==================================== */

export const meApi = {
  profile() {
    return get<PublicUser & { driver?: DriverProfile; score?: number | null }>('/me')
  },
  onboarding(body: {
    name: string
    phone?: string
    driverType: 'TAXI' | 'PRIVATE_DRIVER' | 'DELIVERY' | 'CARGO' | 'OTHER'
    incomeTarget?: number
    primaryGoal?: string
  }) {
    return post<{ user: PublicUser }>('/me/onboarding', body)
  },
  patchProfile(body: { name?: string; phone?: string; driverType?: string; incomeTarget?: number }) {
    return patch<{ user: PublicUser }>('/me', body)
  },
  privacy(body: { showInLeaderboard?: boolean; shareWeekly?: boolean }) {
    return patch<{ privacy: unknown }>('/me/privacy', body)
  },
  dashboard() {
    return get<DashboardPayload>('/me/dashboard')
  },
  analytics(rangeDays = 30) {
    return get<AnalyticsOutput>(`/me/analytics?range=${rangeDays}`)
  },
  shareWeek() {
    return get<ShareWeek>('/me/share-week')
  },
  score() {
    return get<ScoreResponse>('/me/score')
  },
  recomputeScore() {
    return post<ScoreResponse>('/me/score/recompute')
  },
  export() {
    return get<{ dataUrl: string; fileName: string }>('/me/export')
  },
  deleteAccount() {
    return del<{ ok: boolean }>('/me')
  },
}

/* ============================ finance ==================================== */

export const moneyApi = {
  income() {
    return get<{ items: IncomeRecord[]; nextCursor: string | null }>('/income')
  },
  createIncome(body: { amount: number; date: string; platform: IncomePlatform; tripCount?: number; notes?: string }) {
    return post<IncomeRecord>('/income', body)
  },
  deleteIncome(id: string) {
    return del<{ ok: boolean }>(`/income/${id}`)
  },
  patchIncome(id: string, body: { amount?: number; date?: string; platform?: IncomePlatform; notes?: string }) {
    return patch<IncomeRecord>(`/income/${id}`, body)
  },
  incomeStats() {
    return get<Record<string, unknown>>('/income/stats')
  },
  expenses() {
    return get<{ items: ExpenseRecord[]; nextCursor: string | null }>('/expenses')
  },
  createExpense(body: {
    amount: number
    date: string
    category: ExpenseCategory
    notes?: string
    carId?: string
    receiptUrl?: string
  }) {
    return post<ExpenseRecord>('/expenses', body)
  },
  deleteExpense(id: string) {
    return del<{ ok: boolean }>(`/expenses/${id}`)
  },
  patchExpense(id: string, body: { amount?: number; category?: ExpenseCategory; notes?: string }) {
    return patch<ExpenseRecord>(`/expenses/${id}`, body)
  },
  moneyTable() {
    return get<{
      hourlyNet: string | null
      avgIncomePerDay: string
      avgExpensePerDay: string
      dailyNet: string
      tripsPerDay: number | null
      avgTripIncome: string | null
      fuelShare: string | null
    }>('/me/money-table')
  },
}

/* ============================ work sessions ============================== */

export interface SessionFinish {
  session: WorkSession
  durationMinutes: number
  income: number
  expenses: number
  netProfit: number
}

export const workApi = {
  current() {
    return get<{ session: (WorkSession & { durationMinutes: number }) | null }>('/work-sessions/current')
  },
  start() {
    return post<{ session: WorkSession }>('/work-sessions/start')
  },
  finish(id: string) {
    return post<SessionFinish>(`/work-sessions/${id}/finish`, {})
  },
  list() {
    return get<{ items: WorkSession[] }>('/work-sessions')
  },
}

/* ================================ goals ================================== */

export const goalApi = {
  list() {
    return get<{ items: Goal[] }>('/goals')
  },
  create(body: { title: string; targetAmount: number; emoji?: string; deadline?: string }) {
    return post<Goal>('/goals', body)
  },
  addTransaction(goalId: string, body: { amount: number; note?: string }) {
    return post<{ ok: boolean }>(`/goals/${goalId}/transactions`, body)
  },
  delete(id: string) {
    return del<{ ok: boolean }>(`/goals/${id}`)
  },
}

/* ================================ cars =================================== */

export const carApi = {
  list() {
    return get<{ items: Car[] }>('/cars')
  },
  create(body: { brand: string; model: string; fuelType: string; mileageKms?: number; plate?: string; isPrimary?: boolean }) {
    return post<{ item: Car }>('/cars', body)
  },
  maintenance() {
    return get<{ items: MaintenanceRecord[] }>('/maintenance')
  },
  createMaintenance(body: { carId: string; serviceType: string; date: string; cost: number; nextDueDate?: string; notes?: string }) {
    return post<{ item: MaintenanceRecord }>('/maintenance', body)
  },
  maintenanceDue() {
    return get<{ items: MaintenanceRecord[] }>('/maintenance/due')
  },
  cost(carId: string) {
    return get<CarCost>(`/cars/${carId}/cost`)
  },
}

/* ================================ ai ===================================== */

export const aiApi = {
  chat(message: string) {
    return post<AIResponse>('/ai/chat', { message })
  },
  coach(goalAmount?: number) {
    return post<{ plan: CoachPlan; formatted?: string; isEstimate: boolean }>('/ai/coach', { goalAmount })
  },
  stats() {
    return get<AIStats>('/ai/stats')
  },
}

/* ============================== misc ===================================== */

export const miscApi = {
  support: {
    create(body: { subject: string; message: string; category?: string }) {
      return post<{ id: string }>('/support/tickets', body)
    },
    list() {
      return get<{ items: { id: string; subject: string; status: string; createdAt: string; messages: { body: string }[] }[] }>('/support/tickets')
    },
  },
  notifications: {
    preferences() {
      return get<{ prefs: NotificationPrefs }>('/notifications/preferences')
    },
    updatePreferences(body: { telegramEnabled?: boolean; quietHoursStart?: number; quietHoursEnd?: number; enabled?: Record<string, boolean> }) {
      return patch<{ prefs: NotificationPrefs }>('/notifications/preferences', body)
    },
    list() {
      return get<{ items: unknown[] }>('/notifications')
    },
    unreadCount() {
      return get<{ unread: number }>('/notifications/unread-count')
    },
    markRead(id: string) {
      return post<{ ok: boolean }>(`/notifications/${id}/read`)
    },
  },
}

/* ========================= extended modules ============================== */

export interface ClubOffer {
  id: string
  title: string
  description: string
  discountText: string | null
  category: string
  validUntil: string
  featured: boolean
  partner: { businessName: string; logoUrl: string | null }
}

export interface MarketplaceCategory {
  id: string
  name: string
  icon: string | null
}

export interface MarketplaceListing {
  id: string
  categoryId: string
  category?: { name: string }
  title: string
  description: string | null
  price: number
  condition: string
  location: string | null
  contactPhone: string | null
  status: string
  user?: { name: string | null }
  images?: { id: string; url: string }[]
}

export interface ChallengeItem {
  id: string
  name: string
  description: string | null
  reward: string | null
  startDate: string
  endDate: string
  status: string
  participantCount: number
  joined: boolean
}

export interface RouteItem {
  id: string
  fromCity: string
  toCity: string
  date: string
  departureTime: string | null
  seats: number
  pricePerSeat: number
  carInfo: string | null
  status: string
  user?: { name: string | null }
  _isOwner?: boolean
  _count?: { requests: number }
}

export interface ReferralInfo {
  myCode: string | null
  shareText: string | null
  referredBy: string | null
  stats: { total: number; active: number; rewarded: number }
  items: { id: string; inviteeName: string | null; inviteeOnboarded: boolean; status: string }[]
}

export const extendedApi = {
  club: {
    offers() {
      return get<{ items: ClubOffer[] }>('/club/offers')
    },
    claim(id: string) {
      return post<{ claim: unknown; couponCode: string; message: string }>(`/club/offers/${id}/claim`)
    },
    myClaims() {
      return get<{ items: { couponCode: string; claim: { offer: { title: string } } }[] }>('/club/my-claims')
    },
  },
  marketplace: {
    categories() {
      return get<{ items: MarketplaceCategory[] }>('/marketplace/categories')
    },
    listings() {
      return get<{ items: MarketplaceListing[] }>('/marketplace/listings')
    },
    myListings() {
      return get<{ items: MarketplaceListing[] }>('/marketplace/my-listings')
    },
    create(body: { categoryId: string; title: string; description?: string; price: number; condition: string; location?: string; contactPhone?: string }) {
      return post<{ listing: MarketplaceListing; note: string }>('/marketplace/listings', body)
    },
  },
  routes: {
    search(q: string) {
      return get<{ items: RouteItem[] }>(`/routes/search?q=${encodeURIComponent(q)}`)
    },
    create(body: { fromCity: string; toCity: string; date: string; seats: number; pricePerSeat: number }) {
      return post<{ route: RouteItem }>('/routes', body)
    },
    request(id: string) {
      return post<{ ok: boolean }>(`/routes/${id}/request`)
    },
  },
  challenges: {
    list() {
      return get<{ items: ChallengeItem[] }>('/challenges')
    },
    my() {
      return get<{ items: unknown[] }>('/challenges/my')
    },
    join(id: string) {
      return post<{ ok: boolean }>(`/challenges/${id}/join`)
    },
    leaderboard(id: string) {
      return get<{ items: { userId: string; name: string | null; progress: number | null }[] }>(`/challenges/${id}/leaderboard`)
    },
    optOut(id: string) {
      return patch<{ ok: boolean }>(`/challenges/${id}/opt-out`)
    },
  },
  referrals: {
    info() {
      return get<ReferralInfo>('/referrals')
    },
  },
  subscriptions: {
    current() {
      return get<{ subscription: { id: string; plan: string; status: string; startsAt: string; expiresAt: string } | null }>('/subscriptions/current')
    },
    subscribe() {
      return post<{ paymentId: string; amount: number; provider: string; approvalUrl: string | null; note: string }>('/subscriptions/subscribe', {
        plan: 'PRO',
        provider: 'local',
      })
    },
  },
}

export const api = { get, post, patch, del, uploadForm }
export default api