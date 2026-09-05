import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { prisma, type UserRole } from '@driverhub/database'
import { getEnv } from '../env.js'
import { ApiError } from '../lib/errors.js'

/**
 * JWT authentication + RBAC (spec §3, §40, §41).
 * - `authenticate`: verifies Bearer JWT, loads the user, sets request.user.
 * - `requireRole(...roles)`: after authenticate, enforces role + active status.
 */

// Type `req.user` through @fastify/jwt's own augmentation so our authenticated
// user shape merges cleanly (instead of redeclaring FastifyRequest.user, which
// conflicts with the plugin's `string | object | Buffer` default).
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; kind: 'driver' | 'admin' | 'partner' }
    user: { id: string; kind: 'driver' | 'admin' | 'partner'; role: UserRole; name?: string | null }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (...roles: UserRole[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  const env = getEnv()
  if (!env.JWT_SECRET) {
    if (env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production')
    }
    app.log.warn('JWT_SECRET not set — using an insecure dev secret. Set it in .env for real use.')
  }

  void app.register(jwt, {
    secret: env.JWT_SECRET ?? 'dev-insecure-jwt-secret-change-me',
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  })

  app.decorate('authenticate', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify()
    } catch {
      throw ApiError.unauthorized('Token yaroqsiz yoki muddati o‘tgan')
    }
    const payload = req.user as { id: string; kind: 'driver' | 'admin' } | undefined
    if (!payload?.id) throw ApiError.unauthorized()
    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user || user.deletedAt) throw ApiError.unauthorized()
    if (user.isBanned) throw ApiError.forbidden('Hisob bloklangan')
    if (user.isSuspended) throw ApiError.forbidden('Hisob vaqtincha to‘xtatilgan')
    req.user = {
      id: user.id,
      kind: payload.kind ?? 'driver',
      role: user.role,
      name: user.name,
    }
  })

  app.decorate('requireRole', (...roles: UserRole[]) => {
    return async (req: FastifyRequest) => {
      if (!req.user) throw ApiError.unauthorized()
      if (!roles.includes(req.user.role)) throw ApiError.forbidden('Bu amal uchun ruxsat yetarli emas')
    }
  })
})