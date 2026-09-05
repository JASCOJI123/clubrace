/** UZS formatting + small shared helpers for the Mini App (spec RULE 6: integer so'm). */

export function uzs(n: number): string {
  return `${Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')}`
}

export const SO = 'so‘m'

export function money(n: number): string {
  return `${uzs(n)} ${SO}`
}

export function compactUzs(n: number): string {
  if (n >= 1_000_000) return `${uzs(Math.round(n / 1_000_000))} mln`
  if (n >= 1_000) return `${uzs(Math.round(n / 1_000))} ming`
  return `${Math.round(n)}`
}

export function signMoney(n: number): string {
  const sign = n >= 0 ? '+ ' : '− '
  return `${sign}${uzs(Math.abs(n))} ${SO}`
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h <= 0) return `${m} min`
  return `${h} soat ${m > 0 ? `${m} min` : ''}`.trim()
}

export function shortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' })
}

export function fullDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** Days left until a date (positive → future, negative → past, null → no deadline). */
export function daysLeft(iso: string | null, now = new Date()): number | null {
  if (!iso) return null
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(iso).getTime()
  return Math.ceil((target - start) / 86_400_000)
}

export const PLATFORM_LABEL: Record<string, string> = {
  YANDEX: 'Yandex Go',
  UBER: 'Uber',
  INDRIVE: 'inDrive',
  PRIVATE: 'Shaxsiy',
  DELIVERY: 'Dostavka',
  OTHER: 'Boshqa',
}

export const CATEGORY_LABEL: Record<string, string> = {
  FUEL: '⛽ Yoqilg‘i',
  GAS: '🔵 Gaz',
  OIL: '🛢 Moy',
  REPAIR: '🔧 Ta’mirlash',
  TIRES: '🛞 Shinalar',
  PARKING: '🅿️ To‘xtash joyi',
  CAR_WASH: '🚿 Mashina yuvish',
  INSURANCE: '🛡 Sug‘urta',
  TAX: '💼 Soliq',
  LOAN: '🏦 Kredit / lizing',
  OTHER: '📦 Boshqa',
}

export const DRIVER_TYPE_LABEL: Record<string, string> = {
  TAXI: 'Taxi (soatiga)',
  PRIVATE_DRIVER: 'Shaxsiy haydovchi',
  DELIVERY: 'Dostavka',
  CARGO: 'Yuk tashish',
  OTHER: 'Boshqa',
}

export const SERVICE_LABEL: Record<string, string> = {
  ENGINE_OIL: 'Dvigatel moyi',
  OIL_FILTER: 'Moy filtri',
  AIR_FILTER: 'Havo filtri',
  CABIN_FILTER: 'Salon filtri',
  BRAKE_PADS: 'Tormoz kolodkasi',
  TIRES: 'Shinalar',
  BATTERY: 'Akkumulyator',
  TECHNICAL_INSPECTION: 'Texnik ko‘rik (ToT)',
  INSURANCE: 'Sug‘urta',
  OTHER: 'Boshqa servis',
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Tun hayrli'
  if (h < 12) return 'Xayrli tong'
  if (h < 18) return 'Xayrli kun'
  return 'Xayrli oqshom'
}