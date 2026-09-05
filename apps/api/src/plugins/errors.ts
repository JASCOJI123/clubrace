import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { ZodError } from 'zod'
import { Prisma } from '@driverhub/database'
import { TelegramAuthError } from '@driverhub/telegram'
import { ApiError } from '../lib/errors.js'

/** Centralized error handling + standard error shape (spec §46). */
export const errorPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((err, req, reply) => {
    // Always log server-faults with request_id, never leak stack to clients.
    const e = err as { statusCode?: number; message?: string; stack?: string }
    if (e.statusCode && e.statusCode < 500) {
      req.log.info({ err: e.message, code: (err as ApiError).code }, 'request failed')
    } else {
      req.log.error({ err: e.message, stack: e.stack }, 'unhandled error')
    }

    let body: { success: false; error: { code: string; message: string; details?: unknown } }

    if (err instanceof ZodError) {
      body = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ma’lumotlar noto‘g‘ri',
          details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        },
      }
      return reply.status(422).send(body)
    }

    if (err instanceof ApiError) {
      body = {
        success: false,
        error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
      }
      return reply.status(err.statusCode).send(body)
    }

    if (err instanceof TelegramAuthError) {
      return reply.status(401).send({
        success: false,
        error: { code: err.code, message: 'Telegram avtorizatsiyasi muvaffaqiyatsiz' },
      })
    }

    // Unique constraint
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return reply.status(409).send({
          success: false,
          error: { code: 'CONFLICT', message: 'Bunday yozuv allaqachon mavjud' },
        })
      }
      if (err.code === 'P2025') {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Topilmadi' },
        })
      }
      if (err.code === 'P2003') {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Bog‘liq yozuv mavjud emas' },
        })
      }
    }

    return reply.status(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Serverda xatolik yuz berdi' },
    })
  })
})