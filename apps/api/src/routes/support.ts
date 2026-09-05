import type { FastifyInstance } from 'fastify'
import { prisma } from '@driverhub/database'
import { supportTicketSchema, supportReplySchema, idParam } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { uid, takeNum } from './helpers.js'

// ==================== Support tickets (spec §33) ====================

export async function supportRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.post('/support/tickets', { preHandler: driverOnly }, async (req) => {
    const body = supportTicketSchema.parse(req.body)
    const ticket = await prisma.supportTicket.create({
      data: { userId: uid(req), subject: body.subject, message: body.message },
    })
    return { ticket }
  })

  app.get('/support/tickets', { preHandler: driverOnly }, async (req) => {
    const q = req.query as { cursor?: string; take?: string }
    const take = takeNum(q.take, 20)
    const rows = await prisma.supportTicket.findMany({
      where: { userId: uid(req) },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      include: { _count: { select: { messages: true } } },
    })
    return { items: rows.slice(0, take), nextCursor: rows.length > take ? rows[take]!.id : null }
  })

  app.get('/support/tickets/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId: uid(req) },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!ticket) throw ApiError.notFound('Chipta topilmadi')
    return { ticket }
  })

  app.post('/support/tickets/:id/replies', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = supportReplySchema.parse(req.body)
    const userId = uid(req)
    const ticket = await prisma.supportTicket.findFirst({ where: { id, userId } })
    if (!ticket) throw ApiError.notFound('Chipta topilmadi')
    if (ticket.status === 'CLOSED') throw ApiError.conflict('Chipta yopilgan — yangi chipta oching')
    const message = await prisma.supportMessage.create({
      data: { ticketId: id, authorId: userId, authorRole: 'DRIVER', body: body.body },
    })
    await prisma.supportTicket.update({ where: { id }, data: { status: ticket.status === 'OPEN' ? 'OPEN' : 'IN_PROGRESS' } })
    return { message }
  })
}