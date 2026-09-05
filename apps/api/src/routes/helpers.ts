import type { FastifyRequest } from 'fastify'
import { prisma } from '@driverhub/database'
import { ApiError } from '../lib/errors.js'
import { page } from '../lib/paging.js'

/** Current authenticated user id (routes run behind `authenticate`). */
export function uid(req: FastifyRequest): string {
  if (!req.user?.id) throw ApiError.unauthorized()
  return req.user.id
}

/** Soft-delete guard: WHERE fragment for owned, non-deleted rows. */
export function owned(userId: string, kind: 'income' | 'expense' | 'car' | 'goal' | 'maintenance'): Record<string, unknown> {
  return { userId, deletedAt: null }
}

/**
 * Standard page(query) for cursor-paginated lists that return Prisma rows.
 * `cursor` is the last row's `id` encoded by `page()`.
 */
export function paginate<T>(query: { cursor?: string; take: number }, fetchRows: (opts: { cursor: string | null; take: number }) => Promise<T[]>) {
  return page({
    cursor: query.cursor,
    take: query.take,
    fetch: (cursor, take) => fetchRows({ cursor, take }),
    cursorOf: (item) => String((item as { id: string }).id),
  })
}

/** Override `take` from query with sane bounds. */
export function takeNum(value: unknown, fallback = 20): number {
  const n = typeof value === 'number' ? value : Number(value ?? fallback)
  return Math.max(1, Math.min(50, Number.isFinite(n) ? n : fallback))
}

/** Ensure a car belongs to the current user. Returns the row or 404. */
export async function assertOwnedCar(userId: string, carId?: string) {
  if (!carId) return null
  const car = await prisma.car.findFirst({ where: { id: carId, userId, deletedAt: null } })
  if (!car) throw ApiError.notFound('Mashina topilmadi')
  return car
}