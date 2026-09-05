// Shared domain constants (mirrors Prisma enums for frontend-safe formatting).
// Kept in one place so packages/ui and apps consume identical labels.

export const DRIVER_TYPES = {
  TAXI: '🚕 Taxi',
  PRIVATE_DRIVER: '🚗 Shaxsiy haydovchi',
  DELIVERY: '📦 Yetkazib berish',
  CARGO: '🚛 Yuk tashish',
  OTHER: '🚌 Boshqa',
} as const

export const EXPENSE_CATEGORIES = {
  FUEL: '⛽ Yoqilg‘i (benzin)',
  GAS: '🔥 Gaz',
  OIL: '🛢 Moy',
  REPAIR: '🔧 Ta’mirlash',
  TIRES: '🛞 Shina',
  PARKING: '🅿️ To‘xtash joyi',
  CAR_WASH: '🧽 Avtomoyka',
  INSURANCE: '🛡 Sug‘urta',
  TAX: '🧾 Soliq',
  LOAN: '🏦 Kredit',
  OTHER: '📦 Boshqa',
} as const

export const INCOME_PLATFORMS = {
  YANDEX: 'Yandex',
  UBER: 'Uber',
  INDRIVE: 'inDrive',
  PRIVATE: 'Shaxsiy',
  DELIVERY: 'Yetkazib berish',
  OTHER: 'Boshqa',
} as const

export const MAINTENANCE_TYPES = {
  ENGINE_OIL: '🛢 Dvigatel moyi',
  OIL_FILTER: '🔧 Moy filtri',
  AIR_FILTER: '🌬 Havo filtri',
  CABIN_FILTER: '🧼 Salon filtri',
  BRAKE_PADS: '🛑 Tormoz kolodkalari',
  TIRES: '🛞 Shina',
  BATTERY: '🔋 Akkumulyator',
  TECHNICAL_INSPECTION: '📋 Texnik ko‘rik',
  INSURANCE: '🛡 Sug‘urta',
  OTHER: '📦 Boshqa',
} as const

export const MARKETPLACE_CATEGORIES = {
  CARS: '🚗 Avtomobillar',
  TIRES: '🛞 Shinalar',
  PARTS: '🔩 Ehtiyot qismlar',
  ACCESSORIES: '🎁 Aksessuarlar',
  OIL: '🛢 Moylar',
  TOOLS: '🧰 Asboblar',
  ELECTRONICS: '📱 Elektronika',
  OTHER: '📦 Boshqa',
} as const

export const OFFER_CATEGORIES = {
  FUEL: '⛽ Yoqilg‘i',
  SERVICE: '🔧 Xizmat',
  TIRES: '🛞 Shinalar',
  OIL: '🛢 Moy',
  CAR_WASH: '🧽 Avtomoyka',
  INSURANCE: '🛡 Sug‘urta',
  AUTO_DEALERS: '🚘 Avtosalonlar',
  OTHER: '📦 Boshqa',
} as const

export const LEVELS = {
  ROOKIE: 'ROOKIE',
  ACTIVE: 'ACTIVE',
  PRO: 'PRO',
  ELITE: 'ELITE',
} as const

export type DriverTypeKey = keyof typeof DRIVER_TYPES
export type ExpenseCategoryKey = keyof typeof EXPENSE_CATEGORIES
export type IncomePlatformKey = keyof typeof INCOME_PLATFORMS
export type MaintenanceTypeKey = keyof typeof MAINTENANCE_TYPES

/** Format integer UZS with thin/thick spaces: 287000 -> "287 000" */
export function formatUZS(amount: number): string {
  if (!Number.isFinite(amount)) return '—'
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(Math.round(amount))
  return `${sign}${abs.toLocaleString('en-US').replace(/,/g, ' ')}`
}

/** Format count: 1423 -> "1 423" */
export function formatCount(n: number): string {
  return Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')
}

/** Duration minutes -> "7s 42m" style string per dashboard mock. */
export function formatDuration(totalMinutes: number): string {
  const m = Math.round(totalMinutes)
  if (m < 0) return '0m'
  const h = Math.floor(m / 60)
  const mm = Math.round(m % 60)
  if (h <= 0) return `${mm}m`
  return `${h}h ${mm}m`
}