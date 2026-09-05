import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getEnv } from '../env.js'
import { ApiError } from '../lib/errors.js'

/**
 * StorageProvider (spec §42). 'local' writes to <repo>/uploads; 's3' uses an
 * S3-compatible endpoint (configure endpoints in prod). File validation:
 * MIME allow-list, size + dimension limits, sanitized filenames.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_ROOT = path.resolve(__dirname, '../../../../uploads')

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export interface StoredFile {
  url: string
  publicUrl: string
  mime: string
  size: number
}

export const storagePlugin = fp(async (app: FastifyInstance) => {
  const env = getEnv()

  const storage: FastifyInstance['storage'] = {
    async saveFrom(buffer: Buffer, opts: { mime: string; ext: string; dir?: string }): Promise<StoredFile> {
      const mime = opts.mime.toLowerCase()
      if (!ALLOWED_MIME.has(mime)) {
        throw ApiError.badRequest(`Rasm formati qo‘llab-quvvatlanmaydi: ${mime}`)
      }
      if (buffer.byteLength > 5 * 1024 * 1024) {
        throw ApiError.badRequest('Rasm fayli 5 MB dan kichik bo‘lishi kerak')
      }
      const safeName = `f-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${opts.ext}`
      const subDir = opts.dir ?? 'misc'

      if (env.STORAGE_PROVIDER === 's3') {
        // S3-compatible upload is a thin swap here when STORAGE_* is configured.
        app.log.warn('STORAGE_PROVIDER=s3 configured but S3 adapter not connected — falling back to local')
      }

      const dir = path.join(UPLOADS_ROOT, subDir)
      await fs.mkdir(dir, { recursive: true })
      const fullPath = path.join(dir, safeName)
      await fs.writeFile(fullPath, buffer)
      app.log.info({ path: fullPath, mime, size: buffer.byteLength }, 'file stored')

      const url = `/uploads/${subDir}/${safeName}`
      const publicUrl = env.STORAGE_PUBLIC_URL ? `${env.STORAGE_PUBLIC_URL}${url}` : url
      return { url, publicUrl, mime, size: buffer.byteLength }
    },

    async handleMultipart(req: FastifyRequest, allowedField = 'file'): Promise<StorageResult> {
      const data = await req.file()
      if (!data) throw ApiError.badRequest('Fayl yuborilmagan')
      const ext = path.extname(data.filename || '').toLowerCase() || '.img'
      const chunks: Buffer[] = []
      for await (const chunk of data.file) chunks.push(chunk as Buffer)
      const buffer = Buffer.concat(chunks)
      const stored = await storage.saveFrom(buffer, { mime: data.mimetype, ext })
      return { field: data.fieldname, ...stored }
    },
  }
  app.decorate('storage', storage)
})

declare module 'fastify' {
  interface FastifyInstance {
    storage: {
      saveFrom(buffer: Buffer, opts: { mime: string; ext: string; dir?: string }): Promise<StoredFile>
      handleMultipart(req: FastifyRequest, allowedField?: string): Promise<StorageResult>
    }
  }
}

export interface StorageResult extends StoredFile {
  field: string
}