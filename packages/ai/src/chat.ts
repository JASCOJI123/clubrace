import type { DriverContext, ChatProvider } from './types.js'

/**
 * AIChatService — answers driver questions using their OWN data.
 *
 * - deterministic (default): rule-based intent matching over the driver context.
 *   Honest, real numbers, tagged FACT/ESTIMATE/RECOMMENDATION (spec RULE 5/7).
 * - anthropic: calls the Claude Messages API with a compact structured context
 *   (spec §43). Never exposes raw DB; never lets the model write finance data.
 */

export interface AIRespondOptions {
  context: DriverContext
  provider: ChatProvider
  apiKey?: string
  model?: string
  /** Optional extra facts (e.g. maintenance next-due list) injected as rows. */
  extraFacts?: string[]
  fetchImpl?: typeof fetch
}

export interface AIResponse {
  answer: string
  facts: { FACT: string[]; ESTIMATE: string[]; RECOMMENDATION: string[] }
  usedProvider: ChatProvider
}

const fmt = (n: number) => `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} so‘m`

function detectIntent(message: string): string {
  const m = message.toLowerCase()
  if (/(nega|kamroq|past|tushdi).*(hafta|week)/.test(m) || m.includes('haftani past')) return 'week_low'
  if (m.includes('bugun') && /qancha|ishladim/.test(m)) return 'today'
  if (/xarajat.*ko‘pay|qaysi xarajat|oshd.*xarajat/.test(m)) return 'expense_up'
  if (/xarajat.*kamaytir|qanday.*tejash|kamroq sarf/.test(m)) return 'reduce_expense'
  if (/servis|xizmat.*kerak|texnik|ta’mirlash qachon/.test(m)) return 'maintenance'
  if (/maqsad.*yetaman|qachon yetaman|goal/.test(m)) return 'goal'
  if (/statistika|qancha ishladim|sof foyda|umumiy/.test(m)) return 'stats'
  if (/kerak.*ning|qancha.*kerak|plan/i.test(m)) return 'today'
  return 'fallback'
}

function deterministicAnswer(message: string, ctx: DriverContext, extraFacts: string[]): AIResponse {
  const intent = detectIntent(message)
  const FACT: string[] = []
  const ESTIMATE: string[] = []
  const RECOMMENDATION: string[] = []

  const baseFacts = () => {
    FACT.push(`Oxirgi 30 kunda daromad: ${fmt(ctx.income30d)}`)
    FACT.push(`Oxirgi 30 kunda xarajatlar: ${fmt(ctx.expenses30d)}`)
    FACT.push(`Sof foyda: ${fmt(ctx.netProfit30d)}`)
    FACT.push(`Qayd etilgan kunlar: ${ctx.daysTracked30}/30`)
    if (ctx.workHours30d > 0) FACT.push(`Ishlangan soat: ${ctx.workHours30d}`)
    if (ctx.expenseCoverage < 70) {
      ESTIMATE.push(
        `Xarajatlar qamrovi ${ctx.expenseCoverage}% — sof foyda taxminiy, to‘liq aniq emas (spec §9)`
      )
    }
  }

  let answer = ''
  switch (intent) {
    case 'today': {
      baseFacts()
      answer =
        `Bugungi rejangiz:\n\n${FACT.join('\n')}\n\n` +
        (ctx.avgHourlyNet
          ? `O‘rtacha soatlik sof foydangiz ${fmt(ctx.avgHourlyNet)}. Bugungi maqsadingizga yetish uchun taxminiy hisob, rejalashtirishingiz mumkin.`
          : 'Soatlik hisob uchun «Ishni boshlash» tugmasidan foydalaning.') +
        (extraFacts.length ? `\n\n📌 ${extraFacts.join('\n📌 ')}` : '')
      RECOMMENDATION.push('Har kuni daromad va xarajatni qayd qilish aniqroq reja beradi.')
      break
    }
    case 'week_low': {
      baseFacts()
      const bestDay = ctx.bestDay30d ?? '—'
      answer =
        `Hafta ko‘rsatkichlari tahlil qilindi.\n\n${FACT.join('\n')}\n\n` +
        (bestDay
          ? `Oxirgi 30 kunda eng foydali kuningiz: ${bestDay}. Shu kun tartibini takrorlash hafta natijasini oshirishi mumkin.`
          : 'Bu savolga aniq javob uchun ish sessiyalari kerak.') +
        (ctx.fuelShareOfExpenses30d !== null && ctx.fuelShareOfExpenses30d > 40
          ? `\n\nYoqilg‘i xarajatlaringiz ulushi ${ctx.fuelShareOfExpenses30d}% — bu haftalik farqning katta qismi bo‘lishi mumkin.`
          : '')
      ESTIMATE.push('Haftalik pastlik sabablari taxminiy — doimiy qayd talab etiladi.')
      RECOMMENDATION.push('Eng foydali soatlarni ko‘paytirish orqali hafta natijasini yaxshilang.')
      break
    }
    case 'expense_up': {
      baseFacts()
      const biggest = ctx.biggestExpense30d
      answer =
        `Xarajat tahlili:\n\n${FACT.join('\n')}\n\n` +
        (biggest
          ? `Eng katta xarajat: ${fmt(biggest.amount)} (${biggest.category}).`
          : 'Batafsil xarajat hisoboti uchun qaydlar kerak.')
      if (ctx.fuelShareOfExpenses30d !== null) {
        FACT.push(`Yoqilg‘i xarajatlar ulushi: ${ctx.fuelShareOfExpenses30d}%`)
      }
      RECOMMENDATION.push('Kategoriyalar bo‘yicha xarajat limitini belgilashni sinab ko‘ring.')
      break
    }
    case 'reduce_expense': {
      baseFacts()
      answer =
        `Xarajatlarni kamaytirish bo‘yicha:\n\n${FACT.join('\n')}\n\n` +
        (ctx.fuelShareOfExpenses30d !== null && ctx.fuelShareOfExpenses30d > 40
          ? `Yoqilg‘i ${ctx.fuelShareOfExpenses30d}% ulush bilan eng katta yo‘nalish. Alternativ narxlar va marshrutlarni solishtiring.`
          : 'Yoqilg‘i, ta’mirlash va to‘xtash joylarini har oy guruhlab ko‘ring — eng katta ulushni topasiz.')
      RECOMMENDATION.push('Xarajatlarni har kuni qayd qilish eng samarali yo‘l.')
      break
    }
    case 'maintenance': {
      baseFacts()
      answer =
        `Mashinaga texnik xizmat:\n\n${FACT.join('\n')}\n\n` +
        (ctx.maintenanceCost30d !== null && ctx.maintenanceCost30d > 0
          ? `Oxirgi 30 kunda texnik xizmatga ${fmt(ctx.maintenanceCost30d)} sarflagan.`
          : 'Oxirgi 30 kun davomida ta’mirlash xarajati qayd etilmagan.') +
        (extraFacts.length ? `\n\n⏰ Rejalashtirilgan:\n${extraFacts.join('\n')}` : '\n\nReminder: «Mashina» modulida next-due sanalari ko‘rsatilgan.')
      RECOMMENDATION.push('Moy, filtr va shinalarni rejali almashtirish — buzilishdan arzon.')
      break
    }
    case 'goal': {
      baseFacts()
      if (ctx.goalProgress === null) {
        answer = `Maqsad rejalashtirilmagan. «Maqsadlar» bo‘limida birinchi maqsadni yarating.\n\n${FACT.join('\n')}`
      } else {
        const pct = Math.round(ctx.goalProgress * 100)
        answer =
          `Maqsad progressi: ${pct}%\n\n${FACT.join('\n')}\n\n` +
          (ctx.avgDailyProfit > 0 ? `Kunlik o‘rtacha sof foyda ${fmt(ctx.avgDailyProfit)}.` : '')
        RECOMMENDATION.push(`Kunlik target qo‘shib, ${pct}%dan 100%ga tezlashing.`)
        ESTIMATE.push('Yetish muddati o‘rtacha sur’at asosida taxminiy.')
      }
      break
    }
    case 'stats': {
      baseFacts()
      answer = FACT.join('\n')
      const bestWeek = ctx.bestWeekNet
      if (bestWeek !== null) FACT.push(`Eng yaxshi haftalik sof foyda: ${fmt(bestWeek)}`)
      answer = answer + (bestWeek !== null ? `\nEng yaxshi hafta: ${fmt(bestWeek)}` : '')
      break
    }
    default: {
      baseFacts()
      answer =
        `Men sizning shaxsiy ma’lumotlaringizdan javob bera olaman.\n\n${FACT.join('\n')}\n\n` +
        `Misol savollar:\n• Bugun qancha ishladim?\n• Nega bu hafta kamroq topdim?\n• Qaysi xarajatlarim ko‘paygan?\n• Mashinaga qachon servis kerak?\n• Maqsadimga qachon yetaman?`
      break
    }
  }

  return { answer, facts: { FACT, ESTIMATE, RECOMMENDATION }, usedProvider: 'deterministic' }
}

export async function askAI(message: string, opts: AIRespondOptions): Promise<AIResponse> {
  if (opts.provider === 'anthropic' && opts.apiKey) {
    try {
      return await callClaude(message, opts)
    } catch (err) {
      // If the provider fails (no network, wrong key), fail honest: fall back with a note.
      const fallback = deterministicAnswer(message, opts.context, opts.extraFacts ?? [])
      fallback.facts.ESTIMATE.push('LLM provider mavjud emas, deterministik javob ko‘rsatildi.')
      fallback.usedProvider = 'deterministic'
      void err
      return fallback
    }
  }
  return deterministicAnswer(message, opts.context, opts.extraFacts ?? [])
}

async function callClaude(message: string, opts: AIRespondOptions): Promise<AIResponse> {
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch
  const contextBlock = buildContextText(opts.context, opts.extraFacts ?? [])
  const system =
    `Siz DRIVER HUB AI Coach'asiz. Haydovchining shaxsiy biznes yordamchisi.\n` +
    `Qat'iy qoidalar (spec RULE 5/7):\n` +
    `- Faqat berilgan bugungi ma'lumotlarga asoslanib javob bering.\n` +
    `- Hech qachon yolg'on faktlar o'ylab topmang. Bilmagan narsangizni "mavjud emas" deb ayting.\n` +
    `- Hisob-kitoblar diagnostik bo'ladi; taxminiylarni "ESTIMATE", tavsiyalarni "RECOMMENDATION" deb belgilang.\n` +
    `- Javob o'zbek tilida, qisqa, haydovchiga mos.` +
    contextBlock

  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': opts.apiKey!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model ?? 'claude-sonnet-5',
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: message }],
    }),
  })
  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  const data = (await res.json()) as { content: { type: string; text?: string }[] }
  const answer = (data.content.find((c) => c.type === 'text')?.text ?? '').trim()

  return {
    answer,
    facts: {
      FACT: [],
      ESTIMATE: ['Bu javob LLM tomonidan sizning 30 kunlik qaydlaringiz asosida tayyorlandi.'],
      RECOMMENDATION: ['Faktlarni amaliy qaror sifatida qabul qilganda tekshiring.'],
    } as AIResponse['facts'],
    usedProvider: 'anthropic',
  }
}

function buildContextText(ctx: DriverContext, extraFacts: string[]): string {
  const lines = [
    '## BUGUNGI KONTEKST (real ma\'lumotlar, JSON)',
    JSON.stringify(
      {
        income_30d: ctx.income30d,
        expenses_30d: ctx.expenses30d,
        net_profit_30d: ctx.netProfit30d,
        avg_daily_profit: ctx.avgDailyProfit,
        goal_progress: ctx.goalProgress,
      },
      null,
      0
    ),
    `Qo\'shimcha faktlar:\n${extraFacts.join('\n')}`,
  ]
  return lines.join('\n')
}