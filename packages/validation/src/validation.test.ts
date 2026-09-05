import { describe, expect, it } from 'vitest'
import {
  incomeSchema,
  expenseSchema,
  carSchema,
  goalSchema,
  onboardingSchema,
  offerSchema,
  marketplaceListingSchema,
  routeCreateSchema,
  routeRequestSchema,
} from './index.js'

// Spec RULE 6: money is an integer count of so'm — no floats, no negatives.
describe('money (RULE 6: integer so‘m)', () => {
  it('income accepts an integer amount and coerces dates', () => {
    const ok = incomeSchema.parse({ amount: 1_250_000, date: '2026-09-01', platform: 'YANDEX', notes: 'kunduz' })
    expect(ok.amount).toBe(1_250_000)
    expect(ok.date).toBeInstanceOf(Date)
  })

  it('income rejects a fractional amount (float so‘m)', () => {
    const r = incomeSchema.safeParse({ amount: 12_500.5, date: new Date(), platform: 'PRIVATE' })
    expect(r.success).toBe(false)
  })

  it('income rejects an amount below the minimum', () => {
    const r = incomeSchema.safeParse({ amount: 50, date: new Date(), platform: 'UBER' })
    expect(r.success).toBe(false)
  })

  it('expenses reject negative costs', () => {
    const r = expenseSchema.safeParse({ amount: -10_000, date: new Date(), category: 'FUEL' })
    expect(r.success).toBe(false)
  })

  it('marketplace listings reject prices below 1000', () => {
    const r = marketplaceListingSchema.safeParse({ categoryId: 'not-a-uuid', title: 'x', price: 500, condition: 'USED' })
    expect(r.success).toBe(false)
  })
})

describe('enums and shape', () => {
  it('onboarding rejects an unknown driver type', () => {
    const r = onboardingSchema.safeParse({ name: 'Alisher', driverType: 'SPACESHIP' })
    expect(r.success).toBe(false)
  })

  it('onboarding accepts the canonical driver types', () => {
    for (const t of ['TAXI', 'PRIVATE_DRIVER', 'DELIVERY', 'CARGO', 'OTHER']) {
      const r = onboardingSchema.safeParse({ name: 'Alisher', driverType: t })
      expect(r.success).toBe(true)
    }
  })

  it('car schema defaults mileage to 0 and isPrimary to false (honest default)', () => {
    const car = carSchema.parse({ brand: 'Lacetti', model: 'Gentra', fuelType: 'GAS' })
    expect(car.mileageKms).toBe(0)
    expect(car.isPrimary).toBe(false)
  })

  it('goal rejects a target below 100 000 so‘m', () => {
    const r = goalSchema.safeParse({ title: 'Telefon', targetAmount: 50_000 })
    expect(r.success).toBe(false)
  })

  it('offer requires a valid category', () => {
    const r = offerSchema.safeParse({ title: 'Dizel chegirmasi', category: 'FUEL' })
    expect(r.success).toBe(true)
    const bad = offerSchema.safeParse({ title: 'X', category: 'PIZZA' })
    expect(bad.success).toBe(false)
  })

  it('route seats are bounded 1..20 and time uses HH:MM', () => {
    expect(routeRequestSchema.parse({ seats: 4 }).seats).toBe(4)
    expect(routeRequestSchema.safeParse({ seats: 0 }).success).toBe(false)
    expect(routeRequestSchema.safeParse({ seats: 21 }).success).toBe(false)
    expect(routeCreateSchema.safeParse({ fromCity: 'Toshkent', toCity: 'Samarqand', date: new Date(), departureTime: '9:5' }).success).toBe(false)
  })
})