import type { FastifyInstance } from 'fastify'
import { prisma } from '@driverhub/database'
import { carSchema, idParam, maintenanceSchema, mileageLogSchema } from '@driverhub/validation'
import { ApiError } from '../lib/errors.js'
import { uid, takeNum } from './helpers.js'

// ==================== Cars (spec §15) + maintenance records ====================

export async function carsRoutes(app: FastifyInstance) {
  const driverOnly = [app.authenticate, app.requireRole('DRIVER')]

  app.get('/cars', { preHandler: driverOnly }, async (req) => {
    const q = req.query as { cursor?: string; take?: string }
    const cars = await prisma.car.findMany({
      where: { userId: uid(req), deletedAt: null },
      orderBy: { isPrimary: 'desc' },
      take: takeNum(q.take, 20) + 1,
      skip: q.cursor ? 1 : 0,
      cursor: q.cursor ? { id: q.cursor } : undefined,
    })
    return { items: cars.slice(0, Math.min(takeNum(q.take, 20), 50)), nextCursor: cars.length > takeNum(q.take, 20) ? cars[takeNum(q.take, 20)]!.id : null }
  })

  app.post('/cars', { preHandler: driverOnly }, async (req) => {
    const body = carSchema.parse(req.body)
    const userId = uid(req)
    const isPrimary = body.isPrimary
    await prisma.$transaction(async (tx) => {
      if (isPrimary) await tx.car.updateMany({ where: { userId }, data: { isPrimary: false } })
      await tx.car.create({ data: { ...body, userId } })
    })
    return { ok: true }
  })

  app.get('/cars/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const car = await getOwnedCar(uid(req), id)
    const maintenance = await prisma.maintenanceRecord.findMany({
      where: { carId: id, deletedAt: null },
      orderBy: { date: 'desc' },
      take: 30,
    })
    return { ...car, maintenance }
  })

  app.patch('/cars/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = carSchema.partial().parse(req.body)
    const userId = uid(req)
    await getOwnedCar(userId, id)
    await prisma.$transaction(async (tx) => {
      if (body.isPrimary) await tx.car.updateMany({ where: { userId }, data: { isPrimary: false } })
      await tx.car.update({ where: { id }, data: { ...body, isPrimary: body.isPrimary ?? undefined } })
    })
    return { ok: true }
  })

  app.delete('/cars/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const userId = uid(req)
    const car = await getOwnedCar(userId, id)
    await prisma.car.update({ where: { id }, data: { deletedAt: new Date() } })
    if (car.isPrimary) {
      const next = await prisma.car.findFirst({ where: { userId, deletedAt: null }, orderBy: { createdAt: 'desc' } })
      if (next) await prisma.car.update({ where: { id: next.id }, data: { isPrimary: true } })
    }
    return { ok: true }
  })

  // ---- cost analytics per car ----
  app.get('/cars/:id/cost', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await getOwnedCar(uid(req), id)
    const now = new Date()
    const since = new Date(now.getTime() - 180 * 86_400_000)
    const [maintenance, expenses] = await Promise.all([
      prisma.maintenanceRecord.findMany({ where: { carId: id, deletedAt: null, date: { gte: since } } }),
      prisma.expenseRecord.findMany({ where: { carId: id, deletedAt: null, date: { gte: since } } }),
    ])
    const totalMaintenanceCost = maintenance.reduce((s, m) => s + m.cost, 0)
    const monthsCovered = Math.max(1, Math.ceil(now.getTime() - since.getTime()) / (30 * 86_400_000))
    const fuelCost = expenses.filter((e) => e.category === 'FUEL' || e.category === 'GAS').reduce((s, e) => s + e.amount, 0)
    const car = await prisma.car.findUniqueOrThrow({ where: { id } })
    const km = car.mileageKms > 0 ? car.mileageKms : null
    return {
      totalMaintenanceCost,
      maintenanceCostPerMonth: Math.round(totalMaintenanceCost / monthsCovered),
      maintenanceCostPerKm: km ? Math.round(totalMaintenanceCost / km) : null,
      fuelCostPerKm: km ? Math.round(fuelCost / km) : null,
      totalVehicleCostPerKm: km ? Math.round((totalMaintenanceCost + fuelCost) / km) : null,
      monthsCovered,
    }
  })

  // ---- documents ----
  app.post('/cars/:id/documents', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await getOwnedCar(uid(req), id)
    const stored = await app.storage.handleMultipart(req, 'file')
    await prisma.carDocument.create({
      data: { carId: id, fileUrl: stored.url, type: 'OTHER' },
    })
    return { url: stored.url }
  })

  // ==================== Maintenance records ====================
  app.get('/maintenance', { preHandler: driverOnly }, async (req) => {
    const q = req.query as { carId?: string; take?: string }
    const items = await prisma.maintenanceRecord.findMany({
      where: { userId: uid(req), deletedAt: null, ...(q.carId ? { carId: q.carId } : {}) },
      orderBy: { date: 'desc' },
      take: takeNum(q.take, 50),
      include: { car: { select: { brand: true, model: true } } },
    })
    return { items }
  })

  app.post('/maintenance', { preHandler: driverOnly }, async (req) => {
    const body = maintenanceSchema.parse(req.body)
    await getOwnedCar(uid(req), body.carId)
    const item = await prisma.maintenanceRecord.create({ data: { ...body, userId: uid(req) } })
    return { item }
  })

  app.patch('/maintenance/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const body = maintenanceSchema.partial().parse(req.body)
    const existing = await prisma.maintenanceRecord.findFirst({ where: { id, userId: uid(req), deletedAt: null } })
    if (!existing) throw ApiError.notFound('Servis yozuvi topilmadi')
    const item = await prisma.maintenanceRecord.update({ where: { id }, data: body })
    return { item }
  })

  app.delete('/maintenance/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const existing = await prisma.maintenanceRecord.findFirst({ where: { id, userId: uid(req), deletedAt: null } })
    if (!existing) throw ApiError.notFound('Servis yozuvi topilmadi')
    await prisma.maintenanceRecord.update({ where: { id }, data: { deletedAt: new Date() } })
    return { ok: true }
  })

  // upcoming / overdue maintenance (spec §15 notifications)
  app.get('/maintenance/due', { preHandler: driverOnly }, async (req) => {
    const userId = uid(req)
    const now = new Date()
    const horizon = new Date(now.getTime() + 30 * 86_400_000)
    const items = await prisma.maintenanceRecord.findMany({
      where: { userId, deletedAt: null, nextDueDate: { lte: horizon } },
      orderBy: { nextDueDate: 'asc' },
    })
    return {
      items: items.map((m) => ({
        ...m,
        status: !m.nextDueDate ? 'none' : m.nextDueDate < now ? 'overdue' : m.nextDueDate < horizon ? 'warn' : 'ok',
      })),
    }
  })

  // ==================== Mileage history (odometer over time) ====================
  app.get('/cars/:id/mileage', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    await getOwnedCar(uid(req), id)
    const items = await prisma.carMileageLog.findMany({
      where: { carId: id },
      orderBy: { date: 'asc' },
      take: 200,
    })
    return { items }
  })

  app.post('/cars/:id/mileage', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const userId = uid(req)
    await getOwnedCar(userId, id)
    const body = mileageLogSchema.omit({ carId: true }).parse(req.body)
    const item = await prisma.$transaction(async (tx) => {
      const log = await tx.carMileageLog.create({
        data: { carId: id, userId, mileageKms: body.mileageKms, date: body.date ?? new Date(), note: body.note },
      })
      // Keep Car.mileageKms (used elsewhere for per-km cost math) synced to the
      // highest reading on record, regardless of entry order.
      const max = await tx.carMileageLog.aggregate({ where: { carId: id }, _max: { mileageKms: true } })
      if (max._max.mileageKms != null) {
        await tx.car.update({ where: { id }, data: { mileageKms: max._max.mileageKms } })
      }
      return log
    })
    return { item }
  })

  app.delete('/mileage/:id', { preHandler: driverOnly }, async (req) => {
    const { id } = idParam.parse(req.params)
    const userId = uid(req)
    const existing = await prisma.carMileageLog.findFirst({ where: { id, userId } })
    if (!existing) throw ApiError.notFound('Yozuv topilmadi')
    await prisma.$transaction(async (tx) => {
      await tx.carMileageLog.delete({ where: { id } })
      const max = await tx.carMileageLog.aggregate({ where: { carId: existing.carId }, _max: { mileageKms: true } })
      await tx.car.update({ where: { id: existing.carId }, data: { mileageKms: max._max.mileageKms ?? 0 } })
    })
    return { ok: true }
  })
}

async function getOwnedCar(userId: string, id: string) {
  const car = await prisma.car.findFirst({ where: { id, userId, deletedAt: null } })
  if (!car) throw ApiError.notFound('Mashina topilmadi')
  return car
}