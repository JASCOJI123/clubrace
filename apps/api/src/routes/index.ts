import type { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.js'
import { meRoutes } from './me.js'
import { carsRoutes } from './cars.js'
import { incomeRoutes } from './income.js'
import { expensesRoutes } from './expenses.js'
import { workSessionsRoutes } from './work-sessions.js'
import { goalsRoutes } from './goals.js'
import { aiRoutes } from './ai.js'
import { notificationsRoutes } from './notifications.js'
import { supportRoutes } from './support.js'
import { clubRoutes } from './club.js'
import { marketplaceRoutes } from './marketplace.js'
import { tripRoutes } from './trip-routes.js'
import { challengesRoutes } from './challenges.js'
import { partnersRoutes } from './partners.js'
import { referralsRoutes } from './referrals.js'
import { subscriptionsRoutes, paymentsRoutes } from './subscriptions.js'
import { adminRoutes } from './admin.js'
import { uploadRoutes } from './uploads.js'

/**
 * Every API module (spec §41 path list) registered under /api.
 * The Mini App + Admin panel call the same-origin prefix `/api` (dev: Vite proxy).
 * Swagger picks these up automatically (see app.ts).
 */
export async function registerRoutes(app: FastifyInstance) {
  await Promise.all([
    app.register(authRoutes),
    app.register(meRoutes),
    app.register(carsRoutes),
    app.register(incomeRoutes),
    app.register(expensesRoutes),
    app.register(workSessionsRoutes),
    app.register(goalsRoutes),
    app.register(aiRoutes),
    app.register(notificationsRoutes),
    app.register(supportRoutes),
    app.register(clubRoutes),
    app.register(marketplaceRoutes),
    app.register(tripRoutes),
    app.register(challengesRoutes),
    app.register(partnersRoutes),
    app.register(referralsRoutes),
    app.register(subscriptionsRoutes),
    app.register(paymentsRoutes),
    app.register(adminRoutes),
    app.register(uploadRoutes),
  ])
}