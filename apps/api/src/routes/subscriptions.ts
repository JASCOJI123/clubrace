import type { FastifyInstance } from 'fastify'
import { prisma } from '@driverhub/database'
import { subscribeSchema } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { getProductSettings } from '../services/settingsService.js'
import { paymentProvider } from '../services/paymentProvider.js'
import { idParam } from '@driverhub/validation'
import { uid } from './helpers.js'

// ==================== Subscriptions / PRO (spec §27) ====================
// Price lives in run-time settings (never hardcoded). Local provider verifies
// server-side; Telegram Stars is a documented stub.

export async function subscriptionsRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.get('/subscriptions/current', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    const sub = await prisma.subscription.findFirst({
      where: { userId, plan: 'PRO', status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })
    return { subscription: sub }
  })

  app.post('/subscriptions/subscribe', { preHandler: driverOnly }, async (req) => {
    const body = subscribeSchema.parse(req.body)
    const userId = uid(req)
    const settings = await getProductSettings()
    const priceMonth = settings.pro.priceMonthSoums

    const provider = paymentProvider(body.provider ?? undefined)
    const created = await provider.createPayment({
      userId,
      amount: priceMonth,
      metadata: { plan: 'PRO', source: 'mini-app' },
    })
    return {
      paymentId: created.paymentId,
      pending: created.pending,
      amount: priceMonth,
      provider: provider.name,
      approvalUrl: created.approvalUrl,
      note:
        created.pending && provider.name === 'local'
          ? 'To‘lov ofisda tasdiqlanadi (admin panel: To‘lovlar → Tasdiqlash). Tasdiqlangach PRO faollashadi.'
          : 'To‘lov yaratildi — webhook tasdiqlashini kutmoqda.',
    }
  })
}

// ==================== Payment confirmation (admin) ====================
export async function paymentsRoutes(app: FastifyInstance) {
  const adminOnly = [app.authenticate, app.requireRole('ADMIN', 'MODERATOR')]

  app.get('/payments', { preHandler: adminOnly }, async (req) => {
    const rows = await prisma.payment.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    // Payment has no user relation — join names manually for the admin list.
    const userIds = [...new Set(rows.map((p) => p.userId))]
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    const nameById = new Map(users.map((u) => [u.id, u.name]))
    return { items: rows.map((p) => ({ ...p, userName: nameById.get(p.userId) ?? null })) }
  })

  app.post('/payments/:id/verify', { preHandler: adminOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const { confirmPaymentAndGrantPro } = await import('../services/paymentProvider.js')
    const result = await confirmPaymentAndGrantPro(id, req.user!.id)
    return result
  })
}