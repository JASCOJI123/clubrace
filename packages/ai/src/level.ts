/**
 * Driver levels (spec §19) and XP. Transparent thresholds.
 * XP sources (documented on the Profile screen):
 *   daily activity +2 | expense tracked +1 | goal completed +50
 *   maintenance record +10 | challenge win +80 | first referral active +30
 */

export const LEVEL_THRESHOLDS = {
  ROOKIE: 0,
  ACTIVE: 200,
  PRO: 600,
  ELITE: 1500,
} as const

export type LevelKey = keyof typeof LEVEL_THRESHOLDS

export function levelForXp(xp: number): LevelKey {
  if (xp >= LEVEL_THRESHOLDS.ELITE) return 'ELITE'
  if (xp >= LEVEL_THRESHOLDS.PRO) return 'PRO'
  if (xp >= LEVEL_THRESHOLDS.ACTIVE) return 'ACTIVE'
  return 'ROOKIE'
}

export function nextLevelAt(xp: number): { next: LevelKey | null; missingXp: number } {
  const order: LevelKey[] = ['ROOKIE', 'ACTIVE', 'PRO', 'ELITE']
  const current = levelForXp(xp)
  const idx = order.indexOf(current)
  if (idx === order.length - 1) return { next: null, missingXp: 0 }
  const next = order[idx + 1]!
  return { next, missingXp: Math.max(0, LEVEL_THRESHOLDS[next] - xp) }
}

export function xpProgressPct(xp: number): number {
  const current = levelForXp(xp)
  const { next } = nextLevelAt(xp)
  if (!next) return 100
  const base = LEVEL_THRESHOLDS[current as LevelKey]
  const top = LEVEL_THRESHOLDS[next]
  const span = top - base
  if (span <= 0) return 0
  return Math.min(100, Math.round(((xp - base) / span) * 100))
}