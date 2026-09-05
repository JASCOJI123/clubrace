/** Formatting helpers for the admin + partner panel (Uzbek UI, integer UZS). */

export function money(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${new Intl.NumberFormat('ru-RU').format(v)} so'm`
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function shortDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function daysLeft(iso: string): number | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000)
}

export const DRIVER_TYPE_LABEL: Record<string, string> = {
  TAXI: 'Taksi',
  PRIVATE_DRIVER: 'Shaxsiy haydovchi',
  DELIVERY: 'Yetkazib berish',
  CARGO: 'Yuk tashish',
  OTHER: 'Boshqa',
}

export const LEVEL_LABEL: Record<string, string> = {
  ROOKIE: '🟢 Yangi boshlovchi',
  ACTIVE: '🔵 Faol',
  PRO: '🟣 Professional',
  ELITE: '🟠 Ekspert',
}

export const METRIC_LABEL: Record<string, string> = {
  NET_PROFIT: 'Sof foyda',
  WORK_CONSISTENCY: 'Ish doimiyligi',
  EXPENSE_DISCIPLINE: 'Xarajat intizomi',
  GOAL_PROGRESS: 'Maqsadga erishish',
  ACTIVITY: 'Faollik',
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  APPROVED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
  SUSPENDED: 'To‘xtatilgan',
  REMOVED: 'Olib tashlangan',
  ACTIVE: 'Faol',
  FINISHED: 'Yakunlangan',
  DRAFT: 'Qoralama',
  OPEN: 'Ochiq',
  IN_PROGRESS: 'Jarayonda',
  RESOLVED: 'Hal qilingan',
  CLOSED: 'Yopilgan',
  NEW: 'Yangi',
  CONTACTED: 'Bog‘lanilgan',
  CONVERTED: 'Konvertatsiya',
}

export function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const ok = ['APPROVED', 'ACTIVE', 'CONVERTED', 'RESOLVED', 'CONTACTED']
  const warn = ['PENDING', 'IN_PROGRESS', 'OPEN', 'NEW', 'DRAFT']
  const bad = ['REJECTED', 'SUSPENDED', 'REMOVED', 'CLOSED', 'BANNED']
  if (ok.includes(status)) return 'success'
  if (warn.includes(status)) return 'warning'
  if (bad.includes(status)) return 'danger'
  return 'info'
}