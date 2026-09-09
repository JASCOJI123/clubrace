import type { FastifyInstance } from 'fastify'
import { prisma } from '@driverhub/database'
import { customAlphabet } from 'nanoid'
import { clubSearchSchema, idParam } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { uid, takeNum } from './helpers.js'

const couponAlphabet = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

// ==================== Driver Club (spec §21) ====================
// Partner offers with approval flow; drivers view, click, and claim a unique coupon.

export async function clubRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.get('/club/offers', { preHandler: driverOnly }, async (req) => {
    const q = clubSearchSchema.parse(req.query)
    const items = await prisma.partnerOffer.findMany({
      where: {
        status: 'APPROVED',
        deletedAt: null,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        ...(q.category ? { category: q.category } : {}),
      },
      orderBy: [{ featured: 'desc' }, { views: 'desc' }],
      take: takeNum((req.query as { take?: string }).take, 30),
      include: { partner: { select: { businessName: true, logoUrl: true } } },
    })
    return { items }
  })

  app.get('/club/offers/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const offer = await prisma.partnerOffer.findFirst({
      where: { id, status: 'APPROVED', deletedAt: null },
      include: { partner: { select: { businessName: true, logoUrl: true, address: true, phone: true } } },
    })
    if (!offer) throw ApiError.notFound('Taklif topilmadi')
    // honest view tracking (spec §21 partner analytics)
    await prisma.$transaction([
      prisma.offerView.create({ data: { offerId: id, userId: uid(req) } }),
      prisma.partnerOffer.update({ where: { id }, data: { views: { increment: 1 } } }),
    ])
    const claimed = await prisma.offerClaim.findUnique({ where: { offerId_userId: { offerId: id, userId: uid(req) } } })
    return { offer, claimed: !!claimed }
  })

  app.post('/club/offers/:id/click', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const offer = await prisma.partnerOffer.findFirst({ where: { id, status: 'APPROVED', deletedAt: null } })
    if (!offer) throw ApiError.notFound('Taklif topilmadi')
    await prisma.partnerOffer.update({ where: { id }, data: { clicks: { increment: 1 } } })
    return { ok: true }
  })

  app.post('/club/offers/:id/claim', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const userId = uid(req)
    const offer = await prisma.partnerOffer.findFirst({
      where: { id, status: 'APPROVED', deletedAt: null, OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }] },
    })
    if (!offer) throw ApiError.notFound('Taklif topilmadi yoki muddati o‘tgan')
    try {
      const claim = await prisma.offerClaim.create({
        data: { offerId: id, userId, couponCode: couponAlphabet() },
        include: { offer: { select: { title: true, discountText: true, partner: { select: { businessName: true } } } } },
      })
      return { claim, couponCode: claim.couponCode, message: 'Kupon yaratildi — xizmat ko‘rsatishda ko‘rsating' }
    } catch {
      throw ApiError.conflict('Bu taklif allaqachon qo‘lga kiritilgan')
    }
  })

  app.get('/club/my-claims', { preHandler: driverOnly }, async (req) => {
    const rows = await prisma.offerClaim.findMany({
      where: { userId: uid(req) },
      orderBy: { claimedAt: 'desc' },
      include: {
        offer: {
          select: { id: true, title: true, discountText: true, imageUrl: true, partner: { select: { businessName: true } } },
        },
        redemption: { select: { redeemedAt: true, note: true } },
      },
    })
    return { items: rows }
  })
}