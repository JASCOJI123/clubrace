import type { FastifyInstance } from 'fastify'
import { getEnv } from '../env.js'
import { ApiError } from '../lib/errors.js'
import { uid } from './helpers.js'

// ==================== Uploads (spec §42) ====================
// Generic authenticated image upload; returns a URL a client can attach to any entity.
// Validation (MIME, size) enforced server-side in the storage plugin.

export async function uploadRoutes(app: FastifyInstance) {
  const authed = [app.authenticate]

  app.post('/uploads/image', { preHandler: authed }, async (req) => {
    if (!req.isMultipart()) throw ApiError.badRequest('multipart talab qilinadi')
    void uid(req)
    const stored = await app.storage.handleMultipart(req, 'file')
    return { url: stored.url, publicUrl: stored.publicUrl }
  })

  app.get('/uploads/health', async () => ({
    provider: getEnv().STORAGE_PROVIDER,
    ok: true,
  }))
}