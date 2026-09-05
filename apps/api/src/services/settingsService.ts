import { prisma, type Prisma } from '@driverhub/database'

/**
 * Runtime-configurable business values (spec §27 "Do not hardcode price", §60 demo mode).
 * Single-row settings keys: `products`, `flags`, `marketplace`.
 */

export interface ProductSettings {
  pro: { priceMonthSoums: number }
  marketplaceCommissionPercent: number
}

export interface FlagSettings {
  demoMode: boolean
  liveTelegram: boolean
}

const DEFAULTS: ProductSettings = { pro: { priceMonthSoums: 49_000 }, marketplaceCommissionPercent: 3 }

export async function getProductSettings(): Promise<ProductSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: 'products' } })
  const v = (row?.value ?? {}) as Record<string, unknown>
  return {
    pro: { priceMonthSoums: (v.pro as { priceMonthSoums?: number } | undefined)?.priceMonthSoums ?? DEFAULTS.pro.priceMonthSoums },
    marketplaceCommissionPercent:
      (v.marketplaceCommissionPercent as number | undefined) ?? DEFAULTS.marketplaceCommissionPercent,
  }
}

export async function setProductSettings(
  patch: Partial<ProductSettings>,
  actorId?: string
): Promise<ProductSettings> {
  const current = await getProductSettings()
  const next: ProductSettings = {
    pro: { ...current.pro, ...(patch.pro ?? {}) },
    marketplaceCommissionPercent: patch.marketplaceCommissionPercent ?? current.marketplaceCommissionPercent,
  }
  const value = next as unknown as Prisma.InputJsonValue
  await prisma.systemSetting.upsert({
    where: { key: 'products' },
    create: { key: 'products', value, updatedBy: actorId },
    update: { value, updatedBy: actorId },
  })
  return next
}

export async function getFlags(): Promise<FlagSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: 'flags' } })
  const v = (row?.value ?? {}) as Record<string, unknown>
  return {
    demoMode: (v.demoMode as boolean | undefined) ?? false,
    liveTelegram: (v.liveTelegram as boolean | undefined) ?? false,
  }
}

export async function setFlags(patch: Partial<FlagSettings>, actorId?: string): Promise<FlagSettings> {
  const current = await getFlags()
  const next = { ...current, ...patch }
  await prisma.systemSetting.upsert({
    where: { key: 'flags' },
    create: { key: 'flags', value: next, updatedBy: actorId },
    update: { value: next, updatedBy: actorId },
  })
  return next
}