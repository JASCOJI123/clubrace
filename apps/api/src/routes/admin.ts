import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma, type Prisma } from '@driverhub/database'
import { driverAdminUpdateSchema, broadcastSchema, challengeAdminSchema, settingsUpdateSchema, supportReplySchema, partnerCreateSchema, idParam } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { writeAdminAction } from '../lib/audit.js'
import { getProductSettings, setProductSettings, getFlags, setFlags } from '../services/settingsService.js'
import { takeNum, uid } from './helpers.js'

const DAY = 86_400_000

// ==================== Admin panel (spec §29-§31) ====================
// Everything destructive/tunable is audit-logged (spec §67) & gated to ADMIN/MODERATOR.

export async function adminRoutes(app: FastifyInstance) {
  const adminOnly = [app.authenticate, app.requireRole('ADMIN', 'MODERATOR')]

  // ---- dashboard stats ----
  app.get('/admin/stats', { preHandler: adminOnly }, async (req) => {
    const now = new Date()
    const since = (d: number) => new Date(now.getTime() - d * DAY)
    const [total, todayNew, drivers, demoCount, proSubs, revenue, pendingListings, pendingOffers, pendingReports, openTickets, dau, wau, mau] =
      await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { deletedAt: null, createdAt: { gte: since(1) } } }),
        prisma.user.count({ where: { deletedAt: null, role: 'DRIVER' } }),
        prisma.user.count({ where: { isDemo: true } }),
        prisma.subscription.count({ where: { plan: 'PRO', status: 'ACTIVE' } }),
        prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
        prisma.marketplaceListing.count({ where: { status: 'PENDING' } }),
        prisma.partnerOffer.count({ where: { status: 'PENDING' } }),
        prisma.report.count({ where: { status: 'PENDING' } }),
        prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.user.count({ where: { deletedAt: null, createdAt: { gte: since(1) } } }),
        prisma.user.count({ where: { deletedAt: null, createdAt: { gte: since(7) } } }),
        prisma.user.count({ where: { deletedAt: null, createdAt: { gte: since(30) } } }),
      ])
    return {
      total,
      todayNew,
      drivers,
      demoCount,
      proSubs,
      revenue: revenue._sum.amount ?? 0,
      pending: { listings: pendingListings, offers: pendingOffers, reports: pendingReports },
      supportOpen: openTickets,
      mau: { dau, wau, mau },
    }
  })

  // ---- drivers management ----
  app.get('/admin/drivers', { preHandler: adminOnly }, async (req) => {
    const q = req.query as { search?: string; cursor?: string; take?: string }
    const take = takeNum(q.take, 20)
    const rows = await prisma.user.findMany({
      where: {
        role: 'DRIVER',
        deletedAt: null,
        ...(q.search ? { OR: [{ name: { contains: q.search, mode: 'insensitive' as const } }, { phone: { contains: q.search } }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      include: { driver: true, driverScore: true },
    })
    return { items: rows.slice(0, take), nextCursor: rows.length > take ? rows[take]!.id : null }
  })

  app.get('/admin/drivers/:id', { preHandler: adminOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        driver: true,
        driverScore: true,
        cars: { where: { deletedAt: null } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })
    if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi')
    return { user }
  })

  app.patch('/admin/drivers/:id', { preHandler: adminOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = driverAdminUpdateSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi')
    const actorId = uid(req)
    const updates: Record<string, unknown> = {}
    if (body.isSuspended !== undefined) {
      updates.isSuspended = body.isSuspended
      await writeAdminAction({ actorId, action: 'USER_SUSPEND', targetType: 'user', targetId: id, metadata: { suspended: body.isSuspended } })
    }
    if (body.isBanned !== undefined) {
      updates.isBanned = body.isBanned
      updates.isSuspended = body.isBanned ? true : updates.isSuspended
      await writeAdminAction({
        actorId,
        action: body.isBanned ? 'USER_BAN' : 'USER_RESTORE',
        targetType: 'user',
        targetId: id,
        metadata: { banned: body.isBanned },
      })
    }
    if (body.name) updates.name = body.name
    if (body.verify !== undefined) {
      // documentation note: "verify" is a driver-level flag (roster trust); kept as an audit marker here
      await writeAdminAction({ actorId, action: 'USER_RESTORE', targetType: 'user', targetId: id, metadata: { verified: body.verify } })
    }
    const updated = await prisma.user.update({ where: { id }, data: updates })
    return { user: updated }
  })

  // ---- moderation: marketplace listings ----
  app.get('/admin/moderation/listings', { preHandler: adminOnly }, async (req) => {
    const rows = await prisma.marketplaceListing.findMany({
      where: { status: { in: ['PENDING', 'REJECTED'] } },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: { user: { select: { name: true } }, category: { select: { name: true } }, images: { select: { url: true } } },
    })
    return { items: rows }
  })

  app.post('/admin/moderation/listings/:id', { preHandler: adminOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = (req.body ?? {}) as { action: 'APPROVE' | 'REJECT' | 'REMOVE'; note?: string }
    if (!['APPROVE', 'REJECT', 'REMOVE'].includes(body.action)) throw ApiError.badRequest('action noto‘g‘ri')
    const listing = await prisma.marketplaceListing.findFirst({ where: { id } })
    if (!listing) throw ApiError.notFound('Elon topilmadi')
    const actorId = uid(req)
    const status = body.action === 'APPROVE' ? 'APPROVED' : body.action === 'REJECT' ? 'REJECTED' : 'REMOVED'
    await prisma.marketplaceListing.update({ where: { id }, data: { status, moderationNote: body.note ?? null } })
    await writeAdminAction({
      actorId,
      action: body.action === 'APPROVE' ? 'LISTING_APPROVE' : 'LISTING_REMOVE',
      targetType: 'listing',
      targetId: id,
      metadata: { to: status, note: body.note },
    })
    return { ok: true, status }
  })

  // ---- moderation: partner offers ----
  app.get('/admin/moderation/offers', { preHandler: adminOnly }, async (req) => {
    const rows = await prisma.partnerOffer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { partner: { select: { businessName: true } } },
    })
    return { items: rows }
  })

  app.delete('/admin/moderation/offers/:id', { preHandler: adminOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const offer = await prisma.partnerOffer.findFirst({ where: { id, deletedAt: null } })
    if (!offer) throw ApiError.notFound('Taklif topilmadi')
    await prisma.partnerOffer.update({ where: { id }, data: { deletedAt: new Date() } })
    await writeAdminAction({ actorId: uid(req), action: 'OFFER_REJECT', targetType: 'offer', targetId: id, metadata: { deleted: true } })
    return { ok: true }
  })

  app.post('/admin/moderation/offers/:id', { preHandler: adminOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = (req.body ?? {}) as { action: 'APPROVE' | 'REJECT' | 'SUSPEND'; note?: string }
    if (!['APPROVE', 'REJECT', 'SUSPEND'].includes(body.action)) throw ApiError.badRequest('action noto‘g‘ri')
    const offer = await prisma.partnerOffer.findFirst({ where: { id } })
    if (!offer) throw ApiError.notFound('Taklif topilmadi')
    const status = body.action === 'APPROVE' ? 'APPROVED' : body.action === 'REJECT' ? 'REJECTED' : 'SUSPENDED'
    await prisma.partnerOffer.update({ where: { id }, data: { status } })
    await writeAdminAction({
      actorId: uid(req),
      action: body.action === 'REJECT' ? 'OFFER_REJECT' : 'OFFER_APPROVE',
      targetType: 'offer',
      targetId: id,
      metadata: { to: status, note: body.note },
    })
    return { ok: true, status }
  })

  // ---- moderation: partners & reports ----
  app.post('/admin/partners', { preHandler: adminOnly }, async (req) => {
    const body = partnerCreateSchema.parse(req.body)
    const emailLower = body.email.trim().toLowerCase()

    const existing = await prisma.adminUser.findUnique({ where: { email: emailLower } })
    if (existing) throw ApiError.conflict('Bu email allaqachon ro‘yxatdan o‘tgan')

    const passwordHash = await bcrypt.hash(body.password, 10)

    const { partner } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { role: 'PARTNER', name: body.businessName, onboardingDone: true },
      })
      await tx.adminUser.create({ data: { userId: user.id, email: emailLower, passwordHash } })
      // Admin-created partners go live immediately — no self-signup review needed.
      const partner = await tx.partner.create({
        data: {
          userId: user.id,
          businessName: body.businessName,
          phone: body.phone ?? null,
          category: body.category ?? null,
          status: 'APPROVED',
        },
      })
      return { partner }
    })

    await writeAdminAction({
      actorId: uid(req),
      action: 'OFFER_APPROVE',
      targetType: 'partner',
      targetId: partner.id,
      metadata: { created: true, businessName: body.businessName },
    })

    return { partner }
  })

  app.get('/admin/partners', { preHandler: adminOnly }, async (req) => {
    const rows = await prisma.partner.findMany({
      where: { status: { in: ['PENDING', 'APPROVED', 'SUSPENDED'] } },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: { user: { select: { name: true } }, _count: { select: { offers: true } } },
    })
    return { items: rows }
  })

  app.patch('/admin/partners/:id', { preHandler: adminOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = (req.body ?? {}) as { status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' }
    if (!['APPROVED', 'REJECTED', 'SUSPENDED'].includes(body.status)) throw ApiError.badRequest('status noto‘g‘ri')
    const partner = await prisma.partner.findUnique({ where: { id } })
    if (!partner) throw ApiError.notFound('Hamkor topilmadi')
    // Suspending/rejecting a partner must also revoke their panel login — otherwise
    // a "to'xtatilgan" partner could still sign in with their existing password.
    await prisma.$transaction([
      prisma.partner.update({ where: { id }, data: { status: body.status } }),
      prisma.adminUser.update({ where: { userId: partner.userId }, data: { isActive: body.status === 'APPROVED' } }),
    ])
    await writeAdminAction({
      actorId: uid(req),
      action: 'OFFER_APPROVE',
      targetType: 'partner',
      targetId: id,
      metadata: { to: body.status },
    })
    return { ok: true }
  })

  app.get('/admin/reports', { preHandler: adminOnly }, async (req) => {
    const rows = await prisma.report.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: { reporter: { select: { name: true } } },
    })
    return { items: rows }
  })

  app.post('/admin/reports/:id/resolve', { preHandler: adminOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = (req.body ?? {}) as { action: 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED' }
    if (!['REVIEWED', 'ACTION_TAKEN', 'DISMISSED'].includes(body.action)) throw ApiError.badRequest('action noto‘g‘ri')
    const report = await prisma.report.findUnique({ where: { id } })
    if (!report) throw ApiError.notFound('Shikoyat topilmadi')
    const actorId = uid(req)
    await prisma.report.update({ where: { id }, data: { status: body.action, resolvedBy: actorId, resolvedAt: new Date() } })
    await writeAdminAction({ actorId, action: 'LISTING_REMOVE', targetType: 'report', targetId: id, metadata: { to: body.action } })
    return { ok: true }
  })

  // ---- broadcast (spec §29) ----
  app.post('/admin/broadcast', { preHandler: adminOnly }, async (req) => {
    const body = broadcastSchema.parse(req.body)
    const actorId = uid(req)
    const where: Prisma.UserWhereInput = { role: 'DRIVER', deletedAt: null }
    const and: Prisma.UserWhereInput[] = []
    if (body.audience === 'PRO_DRIVERS') {
      and.push({ subscriptions: { some: { plan: 'PRO', status: 'ACTIVE' } } })
    }
    if (body.driverType) {
      and.push({ driver: { is: { driverType: body.driverType } } })
    }
    if (body.level) {
      and.push({ driver: { is: { level: body.level } } })
    }
    if (and.length) where.AND = and
    // Honest broadcast: creates notification rows for the target audience.
    const targets = await prisma.user.findMany({ where, select: { id: true } })
    const created = await prisma.notification.createMany({
      data: targets.map((t) => ({
        userId: t.id,
        type: 'ANNOUNCEMENT',
        title: 'Yangilik',
        body: body.text,
      })),
    })
    await writeAdminAction({
      actorId,
      action: 'BROADCAST_SENT',
      targetType: 'broadcast',
      metadata: { audience: body.audience, text: body.text, count: created.count },
    })
    return { ok: true, deliveredTo: created.count, note: 'Push-sending worker tomonidan amalga oshiriladi (M7)' }
  })

  // ---- challenges CRUD ----
  app.get('/admin/challenges', { preHandler: adminOnly }, async (req) => {
    const rows = await prisma.challenge.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { _count: { select: { participants: true } } },
    })
    return { items: rows }
  })

  app.post('/admin/challenges', { preHandler: adminOnly }, async (req) => {
    const body = challengeAdminSchema.parse(req.body)
    const challenge = await prisma.challenge.create({
      data: { ...body, createdBy: uid(req) },
    })
    return { challenge }
  })

  app.patch('/admin/challenges/:id', { preHandler: adminOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = challengeAdminSchema.partial().parse(req.body)
    const challenge = await prisma.challenge.update({ where: { id }, data: body })
    return { challenge }
  })

  // ---- settings & demo mode (spec §60) ----
  app.get('/admin/settings', { preHandler: adminOnly }, async (req) => {
    const [products, flags] = await Promise.all([getProductSettings(), getFlags()])
    return {
      proPriceMonth: products.pro.priceMonthSoums,
      marketplaceCommissionPercent: products.marketplaceCommissionPercent,
      demoMode: flags.demoMode,
    }
  })

  app.patch('/admin/settings', { preHandler: adminOnly }, async (req) => {
    const body = settingsUpdateSchema.parse(req.body)
    const actorId = uid(req)
    if (body.demoMode !== undefined) {
      await setFlags({ demoMode: body.demoMode }, actorId)
    }
    if (body.proPriceMonth !== undefined || body.marketplaceCommissionPercent !== undefined) {
      const current = await getProductSettings()
      await setProductSettings(
        {
          pro: body.proPriceMonth !== undefined ? { priceMonthSoums: body.proPriceMonth } : current.pro,
          marketplaceCommissionPercent: body.marketplaceCommissionPercent ?? current.marketplaceCommissionPercent,
        },
        actorId
      )
    }
    await writeAdminAction({ actorId, action: 'SETTINGS_CHANGED', targetType: 'settings', metadata: { body } })
    const [products, flags] = await Promise.all([getProductSettings(), getFlags()])
    return {
      proPriceMonth: products.pro.priceMonthSoums,
      marketplaceCommissionPercent: products.marketplaceCommissionPercent,
      demoMode: flags.demoMode,
    }
  })

  // ---- audit log (spec §67) ----
  app.get('/admin/audit', { preHandler: adminOnly }, async (req) => {
    const q = req.query as { cursor?: string; take?: string }
    const take = takeNum(q.take, 30)
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
    })
    return { items: rows.slice(0, take), nextCursor: rows.length > take ? rows[take]!.id : null }
  })

  // ---- support tickets (admin) ----
  app.get('/admin/support', { preHandler: adminOnly }, async (req) => {
    const rows = await prisma.supportTicket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: { user: { select: { name: true, phone: true } }, _count: { select: { messages: true } } },
    })
    return { items: rows }
  })

  app.post('/admin/support/:id/reply', { preHandler: adminOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = supportReplySchema.parse(req.body)
    const ticket = await prisma.supportTicket.findUnique({ where: { id } })
    if (!ticket) throw ApiError.notFound('Chipta topilmadi')
    const actorId = uid(req)
    await prisma.$transaction([
      prisma.supportMessage.create({ data: { ticketId: id, authorId: actorId, authorRole: req.user!.role, body: body.body } }),
      prisma.supportTicket.update({ where: { id }, data: { status: 'IN_PROGRESS', respondedAt: new Date() } }),
    ])
    await writeAdminAction({ actorId, action: 'USER_RESTORE', targetType: 'ticket', targetId: id })
    return { ok: true }
  })

  app.patch('/admin/support/:id/status', { preHandler: adminOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = (req.body ?? {}) as { status: 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS' }
    if (!['RESOLVED', 'CLOSED', 'IN_PROGRESS'].includes(body.status)) throw ApiError.badRequest('status noto‘g‘ri')
    await prisma.supportTicket.update({ where: { id }, data: { status: body.status } })
    return { ok: true }
  })
}