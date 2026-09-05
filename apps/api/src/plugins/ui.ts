import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import fastifyStatic from '@fastify/static'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Production UI server (M8). The Telegram Mini App and the Admin/Partner panel
 * call the API at the SAME origin `/api` (dev: Vite proxy), so in production the
 * Fastify process also serves the two built SPAs:
 *
 *   /            → apps/web/dist      (Mini App)
 *   /admin       → apps/admin/dist    (Admin + Partner panel)
 *
 * Everything is guarded:
 *  - the plugin is inert (registers nothing) when a dist folder does not exist,
 *    so local dev and unit tests run API-only;
 *  - `/api`, `/uploads`, `/docs`, `/health` are NEVER swallowed by the SPA
 *    fallback — unknown API routes still return a proper JSON 404.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../../../')
const WEB_DIST = path.join(REPO_ROOT, 'apps/web/dist')
const ADMIN_DIST = path.join(REPO_ROOT, 'apps/admin/dist')

function exists(p: string): Promise<boolean> {
  return fs.stat(p).then(() => true, () => false)
}

export const uiPlugin = fp(async (app: FastifyInstance) => {
  const [webReady, adminReady] = await Promise.all([exists(WEB_DIST), exists(ADMIN_DIST)])
  if (!webReady && !adminReady) return

  if (webReady) {
    await app.register(fastifyStatic, { root: WEB_DIST, prefix: '/', decorateReply: false })
    app.log.info({ dir: WEB_DIST }, 'serving Mini App (apps/web/dist) at /')
  }
  if (adminReady) {
    await app.register(fastifyStatic, { root: ADMIN_DIST, prefix: '/admin/', decorateReply: false })
    app.log.info({ dir: ADMIN_DIST }, 'serving Admin panel (apps/admin/dist) at /admin')
  }

  // SPA fallback: unknown paths render index.html (BrowserRouter), except the
  // API/upload/docs/health handles which must return a real JSON 404.
  app.setNotFoundHandler(async (req, reply) => {
    const url = req.raw.url ?? '/'
    if (url.startsWith('/api') || url.startsWith('/uploads') || url.startsWith('/docs') || url.startsWith('/health')) {
      return reply.code(404).send({ message: 'Not found', code: 'NOT_FOUND' })
    }
    const isAdmin = url === '/admin' || url.startsWith('/admin/')
    const dist = isAdmin ? ADMIN_DIST : WEB_DIST
    if (isAdmin ? !adminReady : !webReady) {
      return reply.code(404).send({ message: 'Not found', code: 'NOT_FOUND' })
    }
    try {
      const index = await fs.readFile(path.join(dist, 'index.html'))
      return reply.type('text/html; charset=utf-8').send(index)
    } catch {
      return reply.code(404).send({ message: 'Not found', code: 'NOT_FOUND' })
    }
  })
})