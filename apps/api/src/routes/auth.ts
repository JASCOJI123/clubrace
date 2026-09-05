import type { FastifyInstance } from 'fastify'
import { prisma, type UserRole } from '@driverhub/database'
import bcrypt from 'bcryptjs'
import { validateTelegramInitData, generateReferralCode, TelegramAuthError } from '@driverhub/telegram'
import { getEnv, getFlags } from '../env.js'
import { ApiError } from '../lib/errors.js'
import { writeAudit, writeAdminAction } from '../lib/audit.js'
import { adminLoginSchema } from '@driverhub/validation'

/**
 * Auth (spec §40, §41).
 * - POST /auth/telegram  — Mini App initData → find-or-create user → JWT.
 * - POST /auth/admin/login — email+password (admin panel).
 * - POST /auth/dev-login — DEMO_MODE-only, non-production. Browser dev without Telegram.
 * - GET  /auth/whoami — current actor (drivers, partners, admins).
 */

export async function authRoutes(app: FastifyInstance) {
  const env = getEnv()
  const flags = getFlags()

  app.post('/auth/telegram', async (req) => {
    const body = req.body as { initData?: string }
    if (!body?.initData) throw ApiError.badRequest('initData yuborilishi shart')
    if (!env.TELEGRAM_BOT_TOKEN) throw ApiError.unauthorized('TELEGRAM_BOT_TOKEN sozlanmagan')

    let result
    try {
      result = validateTelegramInitData(body.initData, {
        botToken: env.TELEGRAM_BOT_TOKEN,
      })
    } catch (err) {
      if (err instanceof TelegramAuthError) {
        throw new ApiError(401, err.code, 'Telegram autentifikatsiya xatosi', { code: err.code })
      }
      throw err
    }

    const tgId = BigInt(result.user.id)
    const name = [result.user.first_name, result.user.last_name].filter(Boolean).join(' ') || null

    let user = await prisma.user.findUnique({ where: { telegramId: tgId } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: tgId,
          telegramUsername: result.user.username ?? null,
          telegramFirstName: result.user.first_name ?? null,
          telegramLastName: result.user.last_name ?? null,
          telegramPhotoUrl: result.user.photo_url ?? null,
          name,
          languageCode: result.user.language_code ?? 'uz',
          role: 'DRIVER',
        },
      })
      // referral code seeded from the user id so it's stable per account
      await prisma.user.update({ where: { id: user.id }, data: { referralCode: generateReferralCode(user.id) } })

      // start_param = referral code (e.g. ?start=DHUB1234)
      const startParam = result.startParam?.trim()
      if (startParam) {
        const referrer = await prisma.user.findFirst({ where: { referralCode: startParam, isBanned: false, deletedAt: null } })
        if (referrer && referrer.id !== user.id) {
          await prisma.referral.create({
            data: { referrerId: referrer.id, inviteeId: user.id, status: 'PENDING' },
          }).catch(() => {
            // duplicate / self-referral — ignore
          })
        }
      }
    }

    // Ensure the driver profile row exists (a driver role user always has one)
    await prisma.driver.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    })

    // Partner-facing Mini App users keep their role; drivers stay DRIVER.
    const token = app.jwt.sign({ id: user.id, kind: user.role === 'DRIVER' ? 'driver' : 'partner' })
    return { token, user: publicUser(user) }
  })

  app.post('/auth/dev-login', async (req) => {
    if (!flags.demoMode) throw ApiError.forbidden('dev-login faqat DEMO_MODE rejimida')
    if (env.NODE_ENV === 'production') throw ApiError.forbidden('dev-login ishlatib bo‘lmaydi (production)')
    const body = (req.body ?? {}) as { demoUserId?: string; role?: UserRole }
    const role: UserRole = body.role === 'PARTNER' || body.role === 'ADMIN' ? body.role : 'DRIVER'

    let user = body.demoUserId ? await prisma.user.findUnique({ where: { id: body.demoUserId } }) : null
    if (!user || user.role !== role) {
      user = await prisma.user.findFirst({ where: { role, isDemo: true } })
    }
    if (!user) throw ApiError.notFound('Demo foydalanuvchi topilmadi — avval seed-ni ishga tushiring')
    const token = app.jwt.sign({ id: user.id, kind: role === 'DRIVER' ? 'driver' : 'admin' })
    const full = await prisma.user.findUnique({ where: { id: user.id } })
    return { token, user: full ? publicUser(full) : null, note: 'dev-login faqat mahalliy ishlab chiqish uchun' }
  })

  app.post('/auth/admin/login', async (req) => {
    const body = adminLoginSchema.parse(req.body)
    const admin = await prisma.adminUser.findUnique({ where: { email: body.email.toLowerCase() }, include: { user: true } })
    const ok = admin && (await bcrypt.compare(body.password, admin.passwordHash))
    if (!admin || !ok || !admin.isActive || admin.user.isBanned) {
      throw ApiError.unauthorized('Email yoki parol noto‘g‘ri')
    }
    await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
    const token = app.jwt.sign({ id: admin.userId, kind: 'admin' })
    await writeAdminAction({ actorId: admin.userId, action: 'ADMIN_LOGIN', metadata: { email: admin.email } })
    return {
      token,
      user: { id: admin.userId, email: admin.email, role: admin.user.role, name: admin.user.name },
    }
  })

  app.get('/auth/whoami', { preHandler: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw ApiError.unauthorized()
    const out: Record<string, unknown> = { ...publicUser(user) }
    if (user.role === 'DRIVER') {
      const [driver, score] = await Promise.all([
        prisma.driver.findUnique({ where: { userId: user.id } }),
        prisma.driverScore.findUnique({ where: { userId: user.id } }),
      ])
      out.driver = driver
      out.score = score?.score ?? null
    }
    if (user.role === 'PARTNER') {
      out.partner = await prisma.partner.findUnique({ where: { userId: user.id } })
    }
    if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
      out.admin = await prisma.adminUser.findUnique({ where: { userId: user.id } })
    }
    return out
  })
}

function publicUser(user: {
  id: string
  role: UserRole
  name: string | null
  phone: string | null
  telegramId: bigint | null
  referralCode: string | null
  onboardingDone: boolean
  isSuspended: boolean
  isBanned: boolean
  isDemo: boolean
  settings: unknown
  avatarUrl: string | null
  driverType: unknown
}) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    telegramId: user.telegramId ? user.telegramId.toString() : null,
    referralCode: user.referralCode,
    onboardingDone: user.onboardingDone,
    isSuspended: user.isSuspended,
    isBanned: user.isBanned,
    isDemo: user.isDemo,
    settings: user.settings,
    avatarUrl: user.avatarUrl,
    driverType: user.driverType,
  }
}

export { publicUser }