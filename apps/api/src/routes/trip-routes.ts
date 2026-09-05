import type { FastifyInstance } from 'fastify'
import { prisma, type Prisma } from '@driverhub/database'
import { routeCreateSchema, routeSearchSchema, routeRequestSchema, routeRatingSchema, idParam } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { takeNum, uid } from './helpers.js'

// ==================== Route Marketplace (spec §25) ====================
// Legal note: regulated route-transport go-live needs review (spec §25). Here the
// feature is a real passenger-booking scaffold — publish a trip, request seats.

export async function tripRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.get('/routes/search', { preHandler: driverOnly }, async (req) => {
    const q = routeSearchSchema.parse(req.query)
    const userId = uid(req)
    const take = Math.max(1, Math.min(50, q.take))
    const where = {
      deletedAt: null,
      AND: [
        { status: { not: 'CANCELLED' } },
        q.q
          ? {
              OR: [
                { fromCity: { contains: q.q, mode: 'insensitive' as const } },
                { toCity: { contains: q.q, mode: 'insensitive' as const } },
              ],
            }
          : {},
        { date: { gte: new Date() } },
      ] as Prisma.RouteWhereInput[],
    }
    const rows = await prisma.route.findMany({
      where,
      orderBy: { date: 'asc' },
      take: take + 1,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      include: {
        user: { select: { name: true } },
        _count: { select: { requests: true } },
      },
    })
    // don't leak the owner's own route statuses to requesters
    const items = rows.slice(0, take).map((r) => ({ ...r, _isOwner: r.userId === userId }))
    return { items, nextCursor: rows.length > take ? rows[take]!.id : null }
  })

  app.post('/routes', { preHandler: driverOnly }, async (req) => {
    const body = routeCreateSchema.parse(req.body)
    const route = await prisma.route.create({
      data: {
        userId: uid(req),
        carId: body.carId ?? null,
        fromCity: body.fromCity,
        toCity: body.toCity,
        date: body.date,
        departureTime: body.departureTime ?? null,
        seatsAvailable: body.seatsAvailable,
        price: body.price ?? null,
        description: body.description ?? null,
        status: 'PLANNED',
      },
    })
    return { route }
  })

  app.get('/routes/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const userId = uid(req)
    const route = await prisma.route.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { name: true, phone: true } },
        reviews: { select: { rating: true, comment: true, createdAt: true, reviewerUserId: true } },
      },
    })
    if (!route) throw ApiError.notFound('Marshrut topilmadi')
    const requested = await prisma.routeRequest.findUnique({ where: { routeId_userId: { routeId: id, userId } } })
    return { route, isOwner: route.userId === userId, requested: !!requested }
  })

  app.patch('/routes/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = routeCreateSchema.partial().parse(req.body)
    await assertOwnedRoute(uid(req), id)
    const route = await prisma.route.update({ where: { id }, data: body })
    return { route }
  })

  app.delete('/routes/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await assertOwnedRoute(uid(req), id)
    await prisma.route.update({ where: { id }, data: { deletedAt: new Date() } })
    return { ok: true }
  })

  // ---- requests (from the driver's perspective: request to join) ----
  app.post('/routes/:id/request', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = routeRequestSchema.parse(req.body)
    const userId = uid(req)
    const route = await prisma.route.findFirst({ where: { id, deletedAt: null, status: { in: ['PLANNED', 'ACTIVE'] } } })
    if (!route) throw ApiError.notFound('Marshrut topilmadi')
    if (route.userId === userId) throw ApiError.badRequest('O‘z marshrutingizga ariza bo‘lmaydi')
    if (route.seatsAvailable < body.seats) throw ApiError.conflict('Mavjud o‘rin yetarli emas')
    try {
      const request = await prisma.routeRequest.create({
        data: { routeId: id, userId, seats: body.seats, note: body.note ?? null },
      })
      return { request }
    } catch {
      throw ApiError.conflict('Bu marshrutga ilgari ariza berilgan')
    }
  })

  // owner sees requests
  app.get('/routes/:id/requests', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await assertOwnedRoute(uid(req), id)
    const requests = await prisma.routeRequest.findMany({
      where: { routeId: id, status: 'PENDING' },
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return { items: requests }
  })

  app.post('/routes/:id/requests/:requestId/respond', { preHandler: driverOnly }, async (req) => {
    const { id, requestId } = idParam.parse(req.params) as { id: string; requestId: string }
    const body = (req.body ?? {}) as { accept: boolean }
    await assertOwnedRoute(uid(req), id)
    const request = await prisma.routeRequest.findFirst({ where: { id: requestId, routeId: id, status: 'PENDING' } })
    if (!request) throw ApiError.notFound('Ariza topilmadi')
    const route = await prisma.route.findUniqueOrThrow({ where: { id } })

    if (body.accept) {
      if (route.seatsAvailable < request.seats) throw ApiError.conflict('O‘rin yo‘q')
      await prisma.$transaction([
        prisma.routeRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } }),
        prisma.routePassenger.create({ data: { routeId: id, userId: request.userId } }),
        prisma.route.update({ where: { id }, data: { seatsAvailable: route.seatsAvailable - request.seats } }),
      ])
      return { accepted: true }
    }
    await prisma.routeRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } })
    return { accepted: false }
  })

  // reviews between route participants (spec §25 trust)
  app.post('/routes/review', { preHandler: driverOnly }, async (req) => {
    const body = routeRatingSchema.parse(req.body)
    const reviewerUserId = uid(req)
    const route = await prisma.route.findUnique({ where: { id: body.routeId } })
    if (!route) throw ApiError.notFound('Marshrut topilmadi')
    if (body.reviewedUserId === reviewerUserId) throw ApiError.badRequest('O‘zingizga baho bera olmaysiz')
    if (route.userId !== reviewerUserId && route.userId !== body.reviewedUserId) {
      throw ApiError.forbidden('Faqat marshrut ishtirokchilari baholay oladi')
    }
    const review = await prisma.routeReview.create({
      data: {
        routeId: body.routeId,
        reviewerUserId,
        reviewedUserId: body.reviewedUserId,
        rating: body.rating,
        comment: body.comment ?? null,
      },
    })
    return { review }
  })

  app.get('/routes/:id/passengers', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await assertOwnedRoute(uid(req), id)
    const passengers = await prisma.routePassenger.findMany({
      where: { routeId: id },
      include: { user: { select: { name: true } } },
    })
    return { items: passengers }
  })
}

async function assertOwnedRoute(userId: string, id: string) {
  const route = await prisma.route.findFirst({ where: { id, userId, deletedAt: null } })
  if (!route) throw ApiError.notFound('Marshrut topilmadi')
  return route
}