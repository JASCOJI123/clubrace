import type { FastifyInstance } from 'fastify'
import { prisma } from '@driverhub/database'
import { partnerOnboardingSchema, offerSchema, idParam } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { writeAudit } from '../lib/audit.js'
import { uid, takeNum } from './helpers.js'
import type { PartnerDashboardStats } from '@driverhub/types'

// ==================== Partner panel (spec §5, §21) ====================
// Real onboarding (PENDING → admin approves the partner + its offers).

export async function partnersRoutes(app: FastifyInstance) {
  const anyUser = [app.authenticate]
  const partnerOnly = [app.authenticate, app.requireRole('PARTNER')]

  app.post('/partners/onboarding', { preHandler: anyUser }, async (req) => {
    const body = partnerOnboardingSchema.parse(req.body)
    const userId = uid(req)
    const existing = await prisma.partner.findUnique({ where: { userId } })
    if (existing) throw ApiError.conflict('Siz allaqachon hamkorlikka so‘rov yuborgansiz')
    const partner = await prisma.partner.create({
      data: {
        userId,
        businessName: body.businessName,
        category: body.category ?? null,
        description: body.description ?? null,
        phone: body.phone ?? null,
        address: body.address ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        workingHours: body.workingHours ? { text: body.workingHours } : undefined,
        status: 'PENDING',
      },
    })
    // THIS partner account is now in the partner group (panel access via Telegram login)
    await prisma.user.update({ where: { id: userId }, data: { role: 'PARTNER' } })
    await writeAudit({ actorId: userId, actorRole: 'PARTNER', action: 'SETTINGS_CHANGED', targetType: 'partner', targetId: partner.id })
    return { partner, note: 'Ariza moderatsiyaga yuborildi — tasdiqdan so‘ng taklif joylashingiz mumkin' }
  })

  app.get('/partners/profile', { preHandler: partnerOnly }, async (req) => {
    const partner = await prisma.partner.findUnique({ where: { userId: uid(req) } })
    if (!partner) throw ApiError.notFound('Hamkor profili topilmadi')
    return { partner }
  })

  app.patch('/partners/profile', { preHandler: partnerOnly }, async (req) => {
    const body = partnerOnboardingSchema.partial().parse(req.body)
    const partner = await prisma.partner.update({
      where: { userId: uid(req) },
      data: {
        businessName: body.businessName,
        category: body.category,
        description: body.description,
        phone: body.phone,
        address: body.address,
        lat: body.lat,
        lng: body.lng,
        workingHours: body.workingHours ? { text: body.workingHours } : undefined,
      },
    })
    return { partner }
  })

  // ---- offers ----
  app.get('/partners/offers', { preHandler: partnerOnly }, async (req) => {
    const q = req.query as { take?: string }
    const partner = await requirePartner(uid(req))
    const rows = await prisma.partnerOffer.findMany({
      where: { partnerId: partner.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: takeNum(q.take, 50),
      include: { _count: { select: { claims: true } } },
    })
    return { items: rows }
  })

  app.post('/partners/offers', { preHandler: partnerOnly }, async (req) => {
    const body = offerSchema.parse(req.body)
    const partner = await requirePartner(uid(req))
    if (partner.status !== 'APPROVED') throw ApiError.forbidden('Taklif joylash uchun hamkor tasdiqlangan bo‘lishi kerak')
    const offer = await prisma.partnerOffer.create({
      data: {
        partnerId: partner.id,
        title: body.title,
        description: body.description ?? null,
        discountText: body.discountText ?? null,
        category: body.category,
        validUntil: body.validUntil ?? null,
        status: 'PENDING',
      },
    })
    return { offer, note: 'Taklif moderatsiyadan o‘tkaziladi' }
  })

  app.patch('/partners/offers/:id', { preHandler: partnerOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = offerSchema.partial().parse(req.body)
    const partner = await requirePartner(uid(req))
    const offer = await prisma.partnerOffer.findFirst({ where: { id, partnerId: partner.id, deletedAt: null } })
    if (!offer) throw ApiError.notFound('Taklif topilmadi')
    if (offer.status === 'APPROVED') throw ApiError.conflict('Tasdiqlangan taklifni o‘zgartirib bo‘lmaydi — yangisini joylang')
    const updated = await prisma.partnerOffer.update({ where: { id }, data: body })
    return { offer: updated }
  })

  app.delete('/partners/offers/:id', { preHandler: partnerOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const partner = await requirePartner(uid(req))
    const offer = await prisma.partnerOffer.findFirst({ where: { id, partnerId: partner.id } })
    if (!offer) throw ApiError.notFound('Taklif topilmadi')
    await prisma.partnerOffer.update({ where: { id }, data: { deletedAt: new Date() } })
    return { ok: true }
  })

  app.get('/partners/offers/:id/stats', { preHandler: partnerOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const partner = await requirePartner(uid(req))
    const offer = await prisma.partnerOffer.findFirst({ where: { id, partnerId: partner.id } })
    if (!offer) throw ApiError.notFound('Taklif topilmadi')
    const [views, clicks, claims, leads] = await Promise.all([
      prisma.offerView.count({ where: { offerId: id } }),
      offer.clicks,
      prisma.offerClaim.count({ where: { offerId: id } }),
      prisma.partnerLead.count({ where: { offerId: id } }),
    ])
    return { offerId: id, views, clicks, claims, leads }
  })

  // click-tracking event (partner link in Mini App)
  app.post('/partners/offers/:id/clicks', { preHandler: partnerOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const partner = await requirePartner(uid(req))
    const exists = await prisma.partnerOffer.findFirst({ where: { id, partnerId: partner.id } })
    if (!exists) throw ApiError.notFound('Taklif topilmadi')
    await prisma.partnerOffer.update({ where: { id }, data: { clicks: { increment: 1 } } })
    return { ok: true }
  })

  // ---- leads ----
  app.get('/partners/leads', { preHandler: partnerOnly }, async (req) => {
    const partner = await requirePartner(uid(req))
    const rows = await prisma.partnerLead.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { items: rows }
  })

  app.patch('/partners/leads/:id', { preHandler: partnerOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const partner = await requirePartner(uid(req))
    const body = (req.body ?? {}) as { status?: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED' }
    if (!body.status || !['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'].includes(body.status)) {
      throw ApiError.badRequest('status noto‘g‘ri')
    }
    const lead = await prisma.partnerLead.findFirst({ where: { id, partnerId: partner.id } })
    if (!lead) throw ApiError.notFound('Lead topilmadi')
    const updated = await prisma.partnerLead.update({ where: { id }, data: { status: body.status } })
    return { lead: updated }
  })

  // ---- dashboard (spec §21 partner analytics) ----
  app.get('/partners/dashboard', { preHandler: partnerOnly }, async (req) => {
    const partner = await requirePartner(uid(req))
    const rows = await prisma.partnerOffer.findMany({
      where: { partnerId: partner.id, deletedAt: null },
      select: { views: true, clicks: true, _count: { select: { claims: true } } },
    })
    const claims = rows.reduce((s, r) => s + r._count.claims, 0)
    const leads = await prisma.partnerLead.count({ where: { partnerId: partner.id } })
    const converted = await prisma.partnerLead.count({ where: { partnerId: partner.id, status: 'CONVERTED' } })
    void claims
    const stats: PartnerDashboardStats = {
      views: rows.reduce((s, r) => s + r.views, 0),
      clicks: rows.reduce((s, r) => s + r.clicks, 0),
      leads,
      conversions: converted,
      // honest: a paid-conversion value is only measured once redemptions are price-linked (§21 roadmap)
      revenue: 0,
      offerCount: rows.length,
    }
    return { ...stats, revenueNote: 'Daromad faqat to‘lov bilan bog‘langan amalga oshirilganda hisoblanadi' }
  })
}

async function requirePartner(userId: string) {
  const partner = await prisma.partner.findUnique({ where: { userId } })
  if (!partner) throw ApiError.forbidden('Hamkor profili topilmadi')
  return partner
}