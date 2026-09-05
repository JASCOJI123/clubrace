import { prisma } from '@driverhub/database'
import type { Context, Telegraf } from 'telegraf'
import { getEnv } from './env.js'

/**
 * Bot commands (spec §4, §33).
 * The Mini App is the primary UI; the bot is a lightweight companion.
 * All answers come from the user's own DB data — honest, no fabricated numbers.
 */

const fmt = (n: number): string => `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} so‘m`

function webAppUrl(startParam?: string): string {
  const base = getEnv().TELEGRAM_WEBAPP_URL
  return startParam ? `${base}?startapp=${encodeURIComponent(startParam)}` : base
}

/** Resolve the caller's user row by Telegram id. */
export async function findUser(ctx: Context): Promise<{ id: string; name: string | null; isDemo: boolean } | null> {
  const tgId = ctx.from?.id
  if (!tgId) return null
  return prisma.user.findUnique({ where: { telegramId: BigInt(tgId) } })
}

const appButton = (startParam?: string) => [
  [{ text: '🚕 Ilovani ochish', web_app: { url: webAppUrl(startParam) } }],
]

// ---------------- command cores (shared by bot.command + the /start keyboard) ----------------

// telegraf's `bot.start()` context carries startPayload via a non-exported
// StartContextExtn — widen structurally instead of importing it.
export type StartPayloadCtx = Context & { startPayload?: string }

export async function showStart(ctx: StartPayloadCtx): Promise<void> {
  const startPayload = ctx.startPayload?.trim() || undefined
  const appName = getEnv().APP_NAME

  const greeting =
    `Salom, ${ctx.from?.first_name ?? 'haydovchi'}! 👋\n\n` +
    `Bu — ${appName} boti. Daromad va xarajatlaringizni boshqarish, mashinangizni kuzatish va ` +
    `shaxsiy AI maslahatchidan foydalanish uchun ilovani oching:`

  await ctx.reply(greeting, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚕 Ilovani ochish', web_app: { url: webAppUrl(startPayload) } }],
        [
          { text: 'ℹ️ Yordam', callback_data: 'cmd:/help' },
          { text: '📊 Statistika', callback_data: 'cmd:/stats' },
        ],
      ],
    },
  })

  // If the user already has an account and tapped a referral link, record it now.
  // (Brand-new users get the referral recorded at first Mini App login — the API
  //  reads `startapp` from initData, see /auth/telegram.)
  if (startPayload) {
    const user = await findUser(ctx)
    if (user) {
      const referrer = await prisma.user.findFirst({
        where: { referralCode: startPayload, isBanned: false, deletedAt: null },
        select: { id: true },
      })
      if (referrer && referrer.id !== user.id) {
        await prisma.referral
          .create({ data: { referrerId: referrer.id, inviteeId: user.id, status: 'PENDING' } })
          .catch(() => {}) // duplicate / self-referral — ignore
      }
    }
  }
}

export async function showProfile(ctx: Context): Promise<void> {
  const user = await findUser(ctx)
  if (!user) return sendNotRegistered(ctx)
  const [driver, score, carCount] = await Promise.all([
    prisma.driver.findUnique({ where: { userId: user.id } }),
    prisma.driverScore.findUnique({ where: { userId: user.id } }),
    prisma.car.count({ where: { userId: user.id, deletedAt: null } }),
  ])
  const lines = [
    `👤 *${user.name ?? ctx.from?.first_name ?? 'Haydovchi'}*`,
    // Rejim / faoliyat turi — the driver type is optional until onboarding completes
    driver?.driverType ? `Faoliyat: ${driver.driverType}` : 'Faoliyat turi kiritilmagan',
    `🚗 Mashinalar: ${carCount}`,
    `⭐ Reyting ball: ${score?.score ?? 0}`,
    `📈 Daraja: ${driver?.level ?? 'ROOKIE'} · XP ${driver?.xp ?? 0}`,
    '',
    `✅ Boatingiz tugallanganligi: ${user.isDemo ? 'demo' : 'to‘liq'}`,
  ].filter(Boolean)
  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' })
}

export async function showStats(ctx: Context): Promise<void> {
  const user = await findUser(ctx)
  if (!user) return sendNotRegistered(ctx)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const [income, expenses] = await Promise.all([
    prisma.incomeRecord.findMany({ where: { userId: user.id, deletedAt: null, date: { gte: start } } }),
    prisma.expenseRecord.findMany({ where: { userId: user.id, deletedAt: null, date: { gte: start } } }),
  ])
  const inc = income.reduce((s, r) => s + r.amount, 0)
  const exp = expenses.reduce((s, r) => s + r.amount, 0)
  const net = inc - exp
  const lines = [
    `📊 *Bugungi statistika*`,
    `• Daromad: ${fmt(inc)}`,
    `• Xarajat: ${fmt(exp)}`,
    `• Sof foyda: ${fmt(net)}`,
    '',
    `Batafsil tahlil ilovada — AI Coach sizning ma’lumotlaringiz bo‘yicha javob beradi.`,
    net < 0 ? `⚠️ Bugungi xarajat daromaddan yuqori. Kategoriyalarni ilovada tekshiring.` : '',
  ].filter(Boolean)
  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' })
}

export async function showGoal(ctx: Context): Promise<void> {
  const user = await findUser(ctx)
  if (!user) return sendNotRegistered(ctx)
  const goal = await prisma.goal.findFirst({
    where: { userId: user.id, deletedAt: null, status: 'ACTIVE' },
    include: { transactions: { select: { amount: true } } },
    orderBy: { createdAt: 'desc' },
  })
  if (!goal) {
    await ctx.reply('Maqsad belgilanmagan. «Maqsadlar» bo‘limida birinchi maqsadingizni yarating. 🎯')
    return
  }
  const saved = goal.transactions.reduce((s, t) => s + t.amount, 0)
  const pct = goal.targetAmount > 0 ? Math.round((saved / goal.targetAmount) * 100) : 0
  await ctx.reply(
    `🎯 *Maqsad:* ${goal.title}${goal.emoji ?? ''}\n` +
      `Maqsad: ${fmt(goal.targetAmount)}\n` +
      `To‘plangan: ${fmt(saved)} (${pct}%)\n` +
      (goal.deadline ? `Muddat: ${goal.deadline.toLocaleDateString('uz-UZ')}\n` : '') +
      `\nHar kuni qo‘shish davom eting!`,
    { parse_mode: 'Markdown' }
  )
}

export async function showCar(ctx: Context): Promise<void> {
  const user = await findUser(ctx)
  if (!user) return sendNotRegistered(ctx)
  const car = await prisma.car.findFirst({ where: { userId: user.id, isPrimary: true, deletedAt: null } })
  if (!car) {
    await ctx.reply('Mashina qo‘shilmagan. «Mashina» bo‘limida avtomobilingizni qo‘shing. 🚗')
    return
  }
  const now = new Date()
  const due = await prisma.maintenanceRecord.findMany({
    where: { carId: car.id, deletedAt: null, nextDueDate: { lte: new Date(now.getTime() + 30 * 86_400_000) } },
    orderBy: { nextDueDate: 'asc' },
    take: 3,
  })
  const lines = [
    `🚗 *${car.brand} ${car.model}*`,
    car.plate ? `№ ${car.plate}` : '',
    car.mileageKms > 0 ? `Bosib o‘tgan: ${car.mileageKms.toLocaleString('ru-RU')} km` : '',
    '',
    '🛠 Rejalashtirilgan servis:',
    ...(due.length
      ? due.map((m) => {
          const label = m.nextDueDate! < now ? '🔴 muddati o‘tgan' : '🟡 yaqin'
          return `• ${m.serviceType} — ${label} (${m.nextDueDate!.toLocaleDateString('uz-UZ')})`
        })
      : ['Hammasi rejada — servis shart emas ✅']),
  ].filter(Boolean)
  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' })
}

export async function showHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    'Mavjud buyruqlar:\n' +
      '• /start — boshlash va ilovani ochish\n' +
      '• /app — ilovaga o‘tish\n' +
      '• /profile — profil va reyting\n' +
      '• /stats — bugungi daromad/xarajat\n' +
      '• /goal — maqsad holati\n' +
      '• /car — mashina va servis\n' +
      '• /support — yordam chiptasi\n\n' +
      'To‘liq imkoniyatlar ilovada: AI coach, club chegirmalar, marketplace va boshqalar.',
    { reply_markup: { inline_keyboard: appButton() } }
  )
}

export async function showApp(ctx: Context): Promise<void> {
  await ctx.reply('Asosiy ilova bu yerda 👇', { reply_markup: { inline_keyboard: appButton() } })
}

export async function showSupport(ctx: Context): Promise<void> {
  await ctx.reply(
    'Yordam kerakmi? 🤝\n\nIlova ichida «Support» bo‘limida chipta ochishingiz mumkin.\n' +
      'Tezkor savollar: xarajat qaydi, ishni boshlash, AI Coach sozlamalari.',
    { reply_markup: { inline_keyboard: appButton() } }
  )
}

async function sendNotRegistered(ctx: Context): Promise<void> {
  await ctx.reply(
    '⚙️ Hisobingiz hali aktivlashtirilmagan.\n\nIlovani bir marta oching — keyin barcha buyruqlar ishlaydi.',
    { reply_markup: { inline_keyboard: appButton() } }
  )
}

// ---------------- wire-up ----------------

export function registerCommands(bot: Telegraf): void {
  bot.start(showStart)
  bot.command('app', showApp)
  bot.command('profile', showProfile)
  bot.command('stats', showStats)
  bot.command('goal', showGoal)
  bot.command('car', showCar)
  bot.command('support', showSupport)
  bot.command('help', showHelp)

  // /start inline keyboard dispatches to the same handlers
  bot.action('cmd:/stats', async (ctx) => {
    await showStats(ctx)
    await ctx.answerCbQuery()
  })
  bot.action('cmd:/help', async (ctx) => {
    await showHelp(ctx)
    await ctx.answerCbQuery()
  })
  bot.on('callback_query', (ctx) => ctx.answerCbQuery().catch(() => {}))
}