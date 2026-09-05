import { describe, expect, it } from 'vitest'
import { inQuietHours } from './notify.js'

const at = (h: number, m = 0) => {
  const d = new Date(2026, 0, 5)
  d.setHours(h, m, 0, 0)
  return d
}

describe('inQuietHours', () => {
  it('false when quiet hours are unset', () => {
    expect(inQuietHours(at(3), { start: null, end: null })).toBe(false)
    expect(inQuietHours(at(3), { start: null, end: 6 })).toBe(false)
    expect(inQuietHours(at(3), { start: 22, end: null })).toBe(false)
  })

  it('false when start equals end (no window)', () => {
    expect(inQuietHours(at(10), { start: 10 * 60, end: 10 * 60 })).toBe(false)
  })

  it('same-day window', () => {
    expect(inQuietHours(at(23, 30), { start: 22 * 60, end: 7 * 60 })).toBe(true)
    expect(inQuietHours(at(3, 0), { start: 22 * 60, end: 7 * 60 })).toBe(true)
    expect(inQuietHours(at(8, 0), { start: 22 * 60, end: 7 * 60 })).toBe(false)
    expect(inQuietHours(at(5, 30), { start: 0, end: 6 * 60 })).toBe(true)
    expect(inQuietHours(at(6, 0), { start: 0, end: 6 * 60 })).toBe(false) // end is exclusive
  })

  it('boundary handling', () => {
    expect(inQuietHours(at(22, 0), { start: 22 * 60, end: 7 * 60 })).toBe(true) // start inclusive
    expect(inQuietHours(at(7, 0), { start: 22 * 60, end: 7 * 60 })).toBe(false) // end exclusive
  })
})