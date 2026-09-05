/**
 * Admin + Partner panel API client — thin typed wrapper over the Fastify REST API.
 * Auth: JWT in localStorage ('dh_admin_token'). All admin mutations are audit-logged
 * server-side (spec §67); this client just calls the real endpoints.
 */

let token: string | null = null

export function setToken(t: string | null): void {
  token = t
  if (t) localStorage.setItem('dh_admin_token', t)
  else localStorage.removeItem('dh_admin_token')
}

export function getToken(): string | null {
  if (token === null) token = localStorage.getItem('dh_admin_token')
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
    'Content-Type': 'application/json',
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
    if (res.status === 401 && !path.startsWith('/auth/')) {
      setToken(null)
      window.dispatchEvent(new CustomEvent('dh-auth-expired'))
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

/* ================================ types =================================== */

export type UserRole = 'DRIVER' | 'PARTNER' | 'MODERATOR' | 'ADMIN'

export interface AdminStats {
  total: number
  todayNew: number
  drivers: number
  demoCount: number
  proSubs: number
  revenue: number
  pending: { listings: number; offers: number; reports: number }
  supportOpen: number
  mau: { dau: number; wau: number; mau: number }
}

export interface AdminDriver {
  id: string
  name: string | null
  phone: string | null
  role: UserRole
  isSuspended: boolean
  isBanned: boolean
  isDemo: boolean
  onboardingDone: boolean
  referralCode: string | null
  createdAt: string
  driver: {
    driverType: string | null
    level: string
    xp: number
    incomeTargetMonth: number | null
  } | null
  driverScore: { score: number | null; level: string } | null
}

export interface ListingModerationItem {
  id: string
  title: string
  price: number
  condition: string
  status: string
  moderationNote: string | null
  createdAt: string
  user: { name: string | null } | null
  category: { name: string } | null
}

export interface OfferModerationItem {
  id: string
  title: string
  description: string | null
  discountText: string | null
  category: string
  status: string
  validUntil: string | null
  createdAt: string
  partner: { businessName: string } | null
}

export interface PartnerAdminItem {
  id: string
  businessName: string
  category: string | null
  status: string
  phone: string | null
  createdAt: string
  user: { name: string | null } | null
  _count: { offers: number }
}

export interface ReportItem {
  id: string
  type: string
  reason: string | null
  status: string
  createdAt: string
  reporter: { name: string | null } | null
}

export interface ChallengeAdminItem {
  id: string
  name: string
  description: string | null
  metric: string
  startDate: string
  endDate: string
  reward: string | null
  status: string
  createdAt: string
  _count: { participants: number }
}

export interface AuditEntry {
  id: string
  actorId: string | null
  actorRole: string | null
  action: string
  targetType: string | null
  targetId: string | null
  metadata: unknown
  createdAt: string
}

export interface SupportTicketAdmin {
  id: string
  subject: string
  message: string
  status: string
  createdAt: string
  user: { name: string | null; phone: string | null } | null
  _count: { messages: number }
}

export interface PartnerOffer {
  id: string
  title: string
  description: string | null
  discountText: string | null
  category: string
  validUntil: string | null
  status: string
  views: number
  clicks: number
  createdAt: string
  _count: { claims: number }
}

export interface PartnerLead {
  id: string
  name: string | null
  phone: string | null
  source: string
  status: string
  createdAt: string
}

export interface PartnerProfile {
  id: string
  businessName: string
  category: string | null
  description: string | null
  phone: string | null
  address: string | null
  status: string
  workingHours: unknown
}

/* ================================= auth =================================== */

export const authApi = {
  adminLogin(email: string, password: string) {
    return post<{ token: string; user: { id: string; email: string; role: UserRole; name: string | null } }>('/auth/admin/login', {
      email,
      password,
    })
  },
  devLogin(role: 'PARTNER' | 'ADMIN') {
    return post<{ token: string; user: unknown; note: string }>('/auth/dev-login', { role })
  },
  whoami() {
    return get<Record<string, unknown>>('/auth/whoami')
  },
}

/* ============================== admin api ================================= */

export const adminApi = {
  stats() {
    return get<AdminStats>('/admin/stats')
  },
  drivers(params: { search?: string; cursor?: string; take?: number } = {}) {
    const q = new URLSearchParams()
    if (params.search) q.set('search', params.search)
    if (params.cursor) q.set('cursor', params.cursor)
    if (params.take) q.set('take', String(params.take))
    const s = q.toString()
    return get<{ items: AdminDriver[]; nextCursor: string | null }>(`/admin/drivers${s ? `?${s}` : ''}`)
  },
  driver(id: string) {
    return get<{ user: Record<string, unknown> }>(`/admin/drivers/${id}`)
  },
  patchDriver(id: string, body: { isSuspended?: boolean; isBanned?: boolean; verify?: boolean; name?: string }) {
    return patch<{ user: { id: string } }>(`/admin/drivers/${id}`, body)
  },
  moderationListings() {
    return get<{ items: ListingModerationItem[] }>('/admin/moderation/listings')
  },
  moderateListing(id: string, action: 'APPROVE' | 'REJECT' | 'REMOVE', note?: string) {
    return post<{ ok: boolean; status: string }>(`/admin/moderation/listings/${id}`, { action, note })
  },
  moderationOffers() {
    return get<{ items: OfferModerationItem[] }>('/admin/moderation/offers')
  },
  moderateOffer(id: string, action: 'APPROVE' | 'REJECT' | 'SUSPEND', note?: string) {
    return post<{ ok: boolean; status: string }>(`/admin/moderation/offers/${id}`, { action, note })
  },
  partners() {
    return get<{ items: PartnerAdminItem[] }>('/admin/partners')
  },
  patchPartner(id: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
    return patch<{ ok: boolean }>(`/admin/partners/${id}`, { status })
  },
  reports() {
    return get<{ items: ReportItem[] }>('/admin/reports')
  },
  resolveReport(id: string, action: 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED') {
    return post<{ ok: boolean }>(`/admin/reports/${id}/resolve`, { action })
  },
  broadcast(body: {
    text: string
    audience: 'ALL_DRIVERS' | 'PRO_DRIVERS' | 'CITY' | 'DRIVER_TYPE' | 'LEVEL' | 'INACTIVE'
    city?: string
    driverType?: string
    level?: string
    inactiveDays?: number
  }) {
    return post<{ ok: boolean; deliveredTo: number; note: string }>('/admin/broadcast', body)
  },
  challenges() {
    return get<{ items: ChallengeAdminItem[] }>('/admin/challenges')
  },
  createChallenge(body: {
    name: string
    description?: string
    metric: string
    startDate: string
    endDate: string
    reward?: string
    status?: string
  }) {
    return post<{ challenge: ChallengeAdminItem }>('/admin/challenges', body)
  },
  patchChallenge(id: string, body: Partial<{ name: string; description: string; reward: string; status: string }>) {
    return patch<{ challenge: ChallengeAdminItem }>(`/admin/challenges/${id}`, body)
  },
  settings() {
    return get<{ proPriceMonth: number; marketplaceCommissionPercent: number; demoMode: boolean }>('/admin/settings')
  },
  patchSettings(body: { proPriceMonth?: number; marketplaceCommissionPercent?: number; demoMode?: boolean }) {
    return patch<{ proPriceMonth: number; marketplaceCommissionPercent: number; demoMode: boolean }>('/admin/settings', body)
  },
  audit(params: { cursor?: string; take?: number } = {}) {
    const q = new URLSearchParams()
    if (params.cursor) q.set('cursor', params.cursor)
    if (params.take) q.set('take', String(params.take ?? 30))
    const s = q.toString()
    return get<{ items: AuditEntry[]; nextCursor: string | null }>(`/admin/audit${s ? `?${s}` : ''}`)
  },
  support() {
    return get<{ items: SupportTicketAdmin[] }>('/admin/support')
  },
  replySupport(id: string, body: string) {
    return post<{ ok: boolean }>(`/admin/support/${id}/reply`, { body })
  },
  supportStatus(id: string, status: 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS') {
    return patch<{ ok: boolean }>(`/admin/support/${id}/status`, { status })
  },
}

/* ============================= partner api ================================ */

export const partnerApi = {
  profile() {
    return get<{ partner: PartnerProfile }>('/partners/profile')
  },
  patchProfile(body: Partial<{ businessName: string; description: string; phone: string; address: string }>) {
    return patch<{ partner: PartnerProfile }>('/partners/profile', body)
  },
  offers() {
    return get<{ items: PartnerOffer[] }>('/partners/offers')
  },
  createOffer(body: { title: string; description?: string; discountText?: string; category: string; validUntil?: string }) {
    return post<{ offer: PartnerOffer; note: string }>('/partners/offers', body)
  },
  patchOffer(id: string, body: Partial<{ title: string; description: string; discountText: string; validUntil: string }>) {
    return patch<{ offer: PartnerOffer }>(`/partners/offers/${id}`, body)
  },
  deleteOffer(id: string) {
    return del<{ ok: boolean }>(`/partners/offers/${id}`)
  },
  offerStats(id: string) {
    return get<{ offerId: string; views: number; clicks: number; claims: number; leads: number }>(`/partners/offers/${id}/stats`)
  },
  leads() {
    return get<{ items: PartnerLead[] }>('/partners/leads')
  },
  patchLead(id: string, status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED') {
    return patch<{ lead: PartnerLead }>(`/partners/leads/${id}`, { status })
  },
  dashboard() {
    return get<{ views: number; clicks: number; leads: number; conversions: number; revenue: number; offerCount: number; revenueNote: string }>(
      '/partners/dashboard'
    )
  },
}

export const api = { get, post, patch, del }
export default api