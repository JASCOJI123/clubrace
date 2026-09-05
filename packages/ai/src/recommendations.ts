import type { DriverContext } from './types.js'

/**
 * RecommendationEngine — deterministic, rule-based recommendations computed from
 * the driver's own real data. Never random, never fabricated (spec RULE 5).
 * Each item: text in Uzbek + a machine `kind` + evidence string.
 */

export interface Recommendation {
  kind:
    | 'goal_pace'
    | 'fuel_optimization'
    | 'expense_growth'
    | 'hourly_weak_day'
    | 'maintenance_savings'
    | 'irregular_tracking'
    | 'best_day_insight'
    | 'pro_benefit'
  title: string
  text: string
  tag: 'FACT' | 'ESTIMATE' | 'RECOMMENDATION'
  evidence?: string
}

export function buildRecommendations(ctx: DriverContext): Recommendation[] {
  const out: Recommendation[] = []

  // --- Goal pace (spec §11)
  if (ctx.goalProgress !== null && ctx.goalProgress < 1 && ctx.avgDailyProfit !== null) {
    if (ctx.goalProgress > 0.5) {
      out.push({
        kind: 'goal_pace',
        title: 'Maqsadingiz yo‘lida 🔥',
        text: `Maqsadingiz 50% dan ustidan bajarilgan. Kuniga ${fmt(ctx.avgDailyProfit)} qo‘shsangiz, marraga ishonchli yetasiz.`,
        tag: 'ESTIMATE',
        evidence: `goalProgress=${ctx.goalProgress}`,
      })
    } else if (ctx.goalProgress > 0.25) {
      out.push({
        kind: 'goal_pace',
        title: 'Maqsadga qarab 💪',
        text: `O‘rtacha kunlik sof foydangiz ${fmt(ctx.avgDailyProfit)}. Shu stavka bilan maqsadga yetishingiz mumkin, ammo har kuni qayd yozib boring.`,
        tag: 'ESTIMATE',
        evidence: `avgDailyProfit=${ctx.avgDailyProfit}`,
      })
    } else {
      out.push({
        kind: 'goal_pace',
        title: 'Maqsadni tekshirib ko‘ring 🎯',
        text: `Maqsad bosqichi hozircha past. Kunlik sof foydani oshirish uchun eng foydali soatlarda e’tiborini bering: ${ctx.bestDay30d ?? 'qayd etilgan kunlar'}.`,
        tag: 'RECOMMENDATION',
        evidence: `goalProgress=${ctx.goalProgress}`,
      })
    }
  }

  // --- Fuel optimization (spec: core value prop — expense reduction)
  if (ctx.fuelShareOfExpenses30d !== null && ctx.fuelShareOfExpenses30d > 40) {
    out.push({
      kind: 'fuel_optimization',
      title: 'Yoqilg‘i ulushi yuqori ⛽',
      text: `Sizning xarajatlaringizning ${ctx.fuelShareOfExpenses30d}% yoqilg‘iga ketmoqda. Gaz o‘rnatish yoki iqtisodli marshrut tanlash yangi oy uchun sezilarli farq qilishi mumkin.`,
      tag: 'RECOMMENDATION',
      evidence: `fuelShare=${ctx.fuelShareOfExpenses30d}%`,
    })
  }

  // --- Maintenance savings
  if (ctx.maintenanceCost30d !== null && ctx.maintenanceCost30d > 300_000) {
    out.push({
      kind: 'maintenance_savings',
      title: 'Mashina xarajatlari 🔧',
      text: `Oxirgi 30 kunda texnik xizmatga ${fmt(ctx.maintenanceCost30d)} sarflangan. Rejali ta’mirlash (moy, shina) kutilmagan buzilishlarga qaraganda 2-3 barobar arzon.`,
      tag: 'ESTIMATE',
      evidence: `maintenanceCost30d=${ctx.maintenanceCost30d}`,
    })
  }

  // --- Irregular tracking (spec §9 honesty: incomplete expense => approximate profit)
  if (ctx.expenseCoverage !== null && ctx.expenseCoverage < 70) {
    out.push({
      kind: 'irregular_tracking',
      title: 'Qaydlarni to‘ldiring 📊',
      text: `Kunlarning atigi ${ctx.expenseCoverage}% da xarajat qaydi bor. Sof foyda aniq bo‘lishi uchun har kuni xarajatlarni kiriting — bu ko‘rsatkich ustasida '+5 ball' olib kelishi mumkin.`,
      tag: 'RECOMMENDATION',
      evidence: `expenseCoverage=${ctx.expenseCoverage}%`,
    })
  }

  // --- Best day insight
  if (ctx.bestDay30d && ctx.bestDay30d !== '—') {
    out.push({
      kind: 'best_day_insight',
      title: 'Eng foydali kuningiz',
      text: `Oxirgi 30 kunda eng foydali kun: ${ctx.bestDay30d}. Shu kun tartibini qayta ishlab, haftada ikki marta uyg‘unlashtirishga urining.`,
      tag: 'FACT',
      evidence: `bestDay30d=${ctx.bestDay30d}`,
    })
  }

  return out
}

function fmt(n: number): string {
  return `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} so‘m`
}