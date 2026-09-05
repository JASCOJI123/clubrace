import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { corsOrigins, getEnv } from './env.js'
import { authPlugin } from './plugins/auth.js'
import { errorPlugin } from './plugins/errors.js'
import { storagePlugin, UPLOADS_ROOT } from './plugins/storage.js'
import { uiPlugin } from './plugins/ui.js'
import { registerRoutes } from './routes/index.js'

/** Build the Fastify application (testable via app.inject). */
export function buildApp(opts: { logger?: boolean } = {}): FastifyInstance {
  const env = getEnv()
  const __dirname = path.dirname(fileURLToPath(import.meta.url))

  const app = Fastify({
    logger:
      opts.logger ??
      (env.NODE_ENV !== 'test'
        ? {
            level: env.NODE_ENV === 'development' ? 'info' : 'warn',
            redact: ['req.headers.authorization', '*.password', '*.token', 'req.body.initData'],
          }
        : false),
    trustProxy: true,
    ignoreTrailingSlash: true,
  })

  void app.register(cors, {
    origin: corsOrigins(env),
    credentials: false,
  })

  void app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
  })

  void app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  })

  void app.register(authPlugin)
  void app.register(errorPlugin)
  void app.register(storagePlugin)

  void app.register(fastifyStatic, {
    root: UPLOADS_ROOT,
    prefix: '/uploads/',
    decorateReply: false,
  })

  void app.register(swagger, {
    openapi: {
      info: { title: 'Driver Hub API', version: '0.1.0' },
      tags: [{ name: 'auth' }, { name: 'driver' }, { name: 'admin' }, { name: 'partner' }],
    },
  })
  void app.register(swaggerUi, { routePrefix: '/docs' })

  app.get('/health', async () => ({ status: 'ok', app: env.APP_NAME, time: new Date().toISOString() }))

  void app.register(registerRoutes, { prefix: '/api' })

  // Production single-origin UI server (/ → Mini App, /admin → Admin panel).
  // Inert when the dist folders don't exist (dev / unit tests).
  void app.register(uiPlugin)

  return app
}