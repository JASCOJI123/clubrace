import { money } from './analytics.js'
import type { DriverContext } from './types.js'

/**
 * AI Coach plan builder (spec §12): "Bugun 400 ming topishim kerak." ->
 * "Sizning o‘rtacha soatlik sof foydangiz: 34 000. Taxminan 11.8 soat kerak."
 * Always tagged ESTIMATE — never presented as real-time market data.
 */

export interface CoachPlan {
  goalAmount: number
  avgHourlyNet: number | null
  estHoursNeeded: number | null
  todayProgress: number
  remaining: number
  onTrack: boolean
  canEstimate: boolean
}

export function buildCoachPlan(opts: {
  goalAmount: number
  ctx: DriverContext
  todayIncome?: number
  todayExpenses?: number
}): CoachPlan {
  const goalAmount = opts.goalAmount
  const todayProgress = money((opts.todayIncome ?? 0) - (opts.todayExpenses ?? 0))
  const remaining = money(goalAmount - todayProgress)

  const avgHourlyNet = opts.ctx.avgHourlyNet
  const canEstimate = avgHourlyNet !== null && avgHourlyNet > 0 && remaining > 0
  const estHoursNeeded = canEstimate ? Math.round((remaining / avgHourlyNet) * 10) / 10 : null

  return {
    goalAmount,
    avgHourlyNet,
    estHoursNeeded,
    todayProgress,
    remaining,
    onTrack: remaining <= 0,
    canEstimate,
  }
}

export function formatCoachPlan(plan: CoachPlan): string {
  const lines: string[] = ['🎯 BUGUNGI PLAN']
  lines.push(`Maqsad: ${fmt(plan.goalAmount)}`)
  if (plan.avgHourlyNet !== null) {
    lines.push(`Sizning o‘rtacha soatlik sof foydangiz: ${fmt(plan.avgHourlyNet)}`)
  }
  if (plan.canEstimate && plan.estHoursNeeded !== null) {
    lines.push(`Taxminan: ${plan.estHoursNeeded} soat kerak.`)
  } else if (plan.onTrack) {
    lines.push('Maqsad allaqachon bajarildi! 🎉')
  } else {
    lines.push('Maqsadni baholash uchun ish sessiyasi va xarajat qaydlari kerak.')
  }
  lines.push(`Bugungi progress: ${fmt(plan.todayProgress)}`)
  lines.push(`Qoldi: ${fmt(Math.max(0, plan.remaining))}`)
  if (plan.canEstimate) lines.push('\n[ESTIMATE] Bu taxmin — real vaqtdagi bozor ma’lumoti emas.')
  return lines.join('\n')
}

function fmt(n: number): string {
  return `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} so‘m`
}