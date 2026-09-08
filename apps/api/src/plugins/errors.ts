import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { ZodError } from 'zod'
import { Prisma } from '@driverhub/database'
import { TelegramAuthError } from '@driverhub/telegram'
import { ApiError } from '../lib/errors.js'

/** Centralized error handling + standard error shape (spec §46). */
export const errorPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((err, req, reply) => {
    let status: number
    let body: { success: false; error: { code: string; message: string; details?: unknown } }

    if (err instanceof ZodError) {
      status = 422
      body = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ma’lumotlar noto‘g‘ri',
          details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        },
      }
    } else if (err instanceof ApiError) {
      status = err.statusCode
      body = {
        success: false,
        error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
      }
    } else if (err instanceof TelegramAuthError) {
      status = 401
      body = { success: false, error: { code: err.code, message: 'Telegram avtorizatsiyasi muvaffaqiyatsiz' } }
    } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      status = 409
      body = { success: false, error: { code: 'CONFLICT', message: 'Bunday yozuv allaqachon mavjud' } }
    } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      status = 404
      body = { success: false, error: { code: 'NOT_FOUND', message: 'Topilmadi' } }
    } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      status = 400
      body = { success: false, error: { code: 'BAD_REQUEST', message: 'Bog‘liq yozuv mavjud emas' } }
    } else {
      status = (err as { statusCode?: number }).statusCode ?? 500
      body = { success: false, error: { code: 'INTERNAL_ERROR', message: 'Serverda xatolik yuz berdi' } }
    }

    // Log by the ACTUAL outcome, not a guess made before we knew the error type —
    // native ZodErrors have no .statusCode, so pre-guessing mislabels routine
    // validation failures (422) as severe "unhandled error"s.
    const e = err as { message?: string; stack?: string }
    if (status < 500) {
      req.log.info({ err: e.message, code: body.error.code }, 'request failed')
    } else {
      req.log.error({ err: e.message, stack: e.stack }, 'unhandled error')
    }

    return reply.status(status).send(body)
  })
})