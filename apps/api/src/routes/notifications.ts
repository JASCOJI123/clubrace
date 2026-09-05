import type { FastifyInstance } from 'fastify'
import { prisma, type Prisma } from '@driverhub/database'
import { notificationPrefsSchema, idParam } from '@driverhub/validation'
import { uid, takeNum } from './helpers.js'

// ==================== Notifications (spec §22) ====================

export async function notificationsRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.get('/notifications', { preHandler: driverOnly }, async (req) => {
    const q = req.query as { cursor?: string; take?: string; unreadOnly?: string }
    const take = takeNum(q.take, 20)
    const userId = uid(req)
    const rows = await prisma.notification.findMany({
      where: { userId, ...(q.unreadOnly === 'true' ? { isRead: false } : {}) },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: take + 1,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
    })
    return { items: rows.slice(0, take), nextCursor: rows.length > take ? rows[take]!.id : null }
  })

  app.get('/notifications/unread-count', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    const unread = await prisma.notification.count({ where: { userId, isRead: false } })
    return { unread }
  })

  app.post('/notifications/:id/read', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await prisma.notification.updateMany({ where: { id, userId: uid(req) }, data: { isRead: true } })
    return { ok: true }
  })

  app.post('/notifications/read-all', { preHandler: driverOnly }, async (req) => {
    await prisma.notification.updateMany({ where: { userId: uid(req), isRead: false }, data: { isRead: true } })
    return { ok: true }
  })

  // ---- preferences ----
  app.get('/notifications/preferences', { preHandler: driverOnly }, async (req) => {
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: uid(req) },
      create: { userId: uid(req) },
      update: {},
    })
    return { prefs }
  })

  app.patch('/notifications/preferences', { preHandler: driverOnly }, async (req) => {
    const body = notificationPrefsSchema.parse(req.body)
    const userId = uid(req)
    const current = await prisma.notificationPreference.upsert({ where: { userId }, create: { userId }, update: {} })
    const prefs = await prisma.notificationPreference.update({
      where: { userId },
      data: {
        telegramEnabled: body.telegramEnabled,
        quietHoursStart: body.quietHoursStart !== undefined ? body.quietHoursStart : current.quietHoursStart,
        quietHoursEnd: body.quietHoursEnd !== undefined ? body.quietHoursEnd : current.quietHoursEnd,
        enabled: (body.enabled ?? current.enabled) as unknown as Prisma.InputJsonValue,
      },
    })
    return { prefs }
  })
}