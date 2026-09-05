import type { FastifyInstance } from 'fastify'
import { prisma, type Prisma } from '@driverhub/database'
import { marketplaceListingSchema, marketplaceSearchSchema, reportListingSchema, idParam } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { uid } from './helpers.js'

// ==================== Driver Marketplace (spec §23) ====================
// Real CRUD + moderation gate (PENDING → APPROVED by admin) + favorites + reports.

export async function marketplaceRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.get('/marketplace/categories', { preHandler: driverOnly }, async (req) => {
    const categories = await prisma.marketplaceCategory.findMany({ orderBy: { order: 'asc' } })
    return { items: categories }
  })

  app.get('/marketplace/listings', { preHandler: driverOnly }, async (req) => {
    const q = marketplaceSearchSchema.parse(req.query)
    const userId = uid(req)
    // drivers only browse APPROVED; owners always see their own rows
    const visibilityOr: Prisma.MarketplaceListingWhereInput[] = [{ status: 'APPROVED' }, { userId }]
    const textOr: Prisma.MarketplaceListingWhereInput[] = q.q
      ? [
          { title: { contains: q.q, mode: 'insensitive' as const } },
          { description: { contains: q.q, mode: 'insensitive' as const } },
        ]
      : []
    const where: Prisma.MarketplaceListingWhereInput = {
      deletedAt: null,
      ...(q.status ? { status: q.status as Prisma.MarketplaceListingWhereInput['status'] } : { OR: visibilityOr }),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      AND: textOr.slice(0, textOr.length > 1 ? textOr.length : 0) as [Prisma.MarketplaceListingWhereInput, ...Prisma.MarketplaceListingWhereInput[]],
    }
    const take = Math.max(1, Math.min(50, q.take))
    const rows = await prisma.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      include: {
        category: { select: { name: true, emoji: true } },
        images: { select: { url: true }, orderBy: { order: 'asc' } },
        _count: { select: { favoriteBy: true } },
      },
    })
    return { items: rows.slice(0, take), nextCursor: rows.length > take ? rows[take]!.id : null }
  })

  app.get('/marketplace/my-listings', { preHandler: driverOnly }, async (req) => {
    const rows = await prisma.marketplaceListing.findMany({
      where: { userId: uid(req), deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { name: true, emoji: true } }, images: true, _count: { select: { favoriteBy: true } } },
    })
    return { items: rows }
  })

  app.post('/marketplace/listings', { preHandler: driverOnly }, async (req) => {
    const body = marketplaceListingSchema.parse(req.body)
    const category = await prisma.marketplaceCategory.findUnique({ where: { id: body.categoryId } })
    if (!category) throw ApiError.badRequest('Kategoriya topilmadi')
    const listing = await prisma.marketplaceListing.create({
      data: {
        userId: uid(req),
        categoryId: body.categoryId,
        title: body.title,
        description: body.description ?? null,
        price: body.price,
        condition: body.condition,
        location: body.location ?? null,
        contactPhone: body.contactPhone ?? null,
        status: 'PENDING',
      },
    })
    return { listing, note: 'Elon moderatsiyaga yuborildi' }
  })

  app.get('/marketplace/listings/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const userId = uid(req)
    const listing = await prisma.marketplaceListing.findFirst({
      where: { id, deletedAt: null, OR: [{ status: 'APPROVED' }, { userId }] },
      include: {
        user: { select: { name: true } },
        category: { select: { name: true, emoji: true } },
        images: { select: { url: true }, orderBy: { order: 'asc' } },
        _count: { select: { favoriteBy: true } },
      },
    })
    if (!listing) throw ApiError.notFound('Elon topilmadi')
    const isFavorite = await prisma.marketplaceFavorite.findUnique({ where: { listingId_userId: { listingId: id, userId } } })
    return { listing, isFavorite: !!isFavorite }
  })

  app.patch('/marketplace/listings/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = marketplaceListingSchema.partial().parse(req.body)
    await assertOwnedListing(uid(req), id)
    const listing = await prisma.marketplaceListing.update({ where: { id }, data: { ...body } })
    return { listing }
  })

  app.delete('/marketplace/listings/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await assertOwnedListing(uid(req), id)
    await prisma.marketplaceListing.update({ where: { id }, data: { deletedAt: new Date() } })
    return { ok: true }
  })

  // images: multipart upload, or { url } body to reuse an earlier /uploads/image
  app.post('/marketplace/listings/:id/images', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await assertOwnedListing(uid(req), id)
    const url = req.isMultipart()
      ? (await app.storage.handleMultipart(req, 'file')).url
      : ((req.body as { url?: string })?.url ?? null)
    if (!url) throw ApiError.badRequest('url yoki fayl kerak')
    const count = await prisma.marketplaceImage.count({ where: { listingId: id } })
    await prisma.marketplaceImage.create({ data: { listingId: id, url, order: count } })
    return { ok: true }
  })

  app.post('/marketplace/listings/:id/favorite', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const userId = uid(req)
    const existing = await prisma.marketplaceFavorite.findUnique({ where: { listingId_userId: { listingId: id, userId } } })
    if (existing) {
      await prisma.marketplaceFavorite.delete({ where: { id: existing.id } })
      return { isFavorite: false }
    }
    await prisma.marketplaceFavorite.create({ data: { listingId: id, userId } })
    return { isFavorite: true }
  })

  app.post('/marketplace/listings/:id/report', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = reportListingSchema.parse(req.body)
    const reporterId = uid(req)
    await prisma.marketplaceReport.create({
      data: { listingId: id, reporterId, reason: body.reason, description: body.description ?? null },
    })
    return { ok: true, note: 'Shikoyat moderatsiyaga yuborildi' }
  })
}

async function assertOwnedListing(userId: string, id: string) {
  const listing = await prisma.marketplaceListing.findFirst({ where: { id, userId, deletedAt: null } })
  if (!listing) throw ApiError.notFound('Elon topilmadi')
  return listing
}