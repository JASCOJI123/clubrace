import { describe, expect, it } from 'vitest'
import { createHmac } from 'node:crypto'
import {
  buildDataCheckString,
  generateReferralCode,
  TelegramAuthError,
  validateTelegramInitData,
} from './index.js'

const BOT_TOKEN = '123456:TEST-TOKEN-abcDEF'

/** Build a VALID initData query string for the given token & user. */
function makeValidInitData(overrides: { authDate?: number; startParam?: string } = {}) {
  const authDate = overrides.authDate ?? 1_700_000_000
  const user = { id: 777, first_name: 'Aziz', username: 'aziz', language_code: 'uz' }
  const pairs: [string, string][] = [
    ['auth_date', String(authDate)],
    ['query_id', 'AAF_test'],
    ['user', encodeURIComponent(JSON.stringify(user))],
  ]
  if (overrides.startParam) pairs.push(['start_param', overrides.startParam])
  const checkString = pairs
    .map(([k, v]) => `${k}=${decodeURIComponent(v)}`)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  const hash = createHmac('sha256', secret).update(checkString).digest('hex')
  const ordered = [...pairs, ['hash', hash] as [string, string]]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return ordered.map(([k, v]) => `${k}=${v}`).join('&')
}

describe('buildDataCheckString', () => {
  it('sorts pairs and excludes hash, decodes once', () => {
    const raw = 'b=2&hash=abc&a=1&user=%7B%22id%22%3A1%7D'
    expect(buildDataCheckString(raw)).toBe('a=1\nb=2\nuser={"id":1}')
  })
  it('is stable regardless of input order', () => {
    const rawA = 'user=X&a=1&b=2'
    const rawB = 'b=2&a=1&user=X'
    expect(buildDataCheckString(rawA)).toBe(buildDataCheckString(rawB))
  })
})

describe('validateTelegramInitData', () => {
  it('accepts a genuinely signed initData', () => {
    const now = () => 1_700_000_100 // right after authDate in test data
    const res = validateTelegramInitData(makeValidInitData(), { botToken: BOT_TOKEN, now })
    expect(res.valid).toBe(true)
    expect(res.user.id).toBe(777)
    expect(res.user.username).toBe('aziz')
  })

  it('rejects a tampered hash (signature mismatch)', () => {
    const valid = makeValidInitData()
    const tampered = valid.replace(/hash=[0-9a-f]+/, 'hash=' + '0'.repeat(64))
    expect(() => validateTelegramInitData(tampered, { botToken: BOT_TOKEN })).toThrow(TelegramAuthError)
  })

  it('rejects when auth_date is too old', () => {
    const now = Math.floor(Date.now() / 1000)
    const old = makeValidInitData({ authDate: now - 100_000 })
    expect(() =>
      validateTelegramInitData(old, { botToken: BOT_TOKEN, now: () => now })
    ).toThrowError('initData is too old')
  })

  it('accepts an authDate just under maxAge', () => {
    const now = Math.floor(Date.now() / 1000)
    const res = validateTelegramInitData(makeValidInitData({ authDate: now - 86_000 }), {
      botToken: BOT_TOKEN,
      now: () => now,
    })
    expect(res.valid).toBe(true)
  })

  it('rejects when signed with a different bot token', () => {
    expect(() =>
      validateTelegramInitData(makeValidInitData(), { botToken: 'OTHER:token' })
    ).toThrow(TelegramAuthError)
  })

  it('rejects empty initData', () => {
    expect(() => validateTelegramInitData('', { botToken: BOT_TOKEN })).toThrow(TelegramAuthError)
  })

  it('rejects when bot token not configured', () => {
    expect(() => validateTelegramInitData(makeValidInitData(), { botToken: '' })).toThrow(
      'BOT_TOKEN is not configured'
    )
  })

  it('passes through start_param for referral handling', () => {
    const res = validateTelegramInitData(makeValidInitData({ startParam: 'DHABCD1234' }), {
      botToken: BOT_TOKEN,
      now: () => 1_700_000_100,
    })
    expect(res.startParam).toBe('DHABCD1234')
  })
})

describe('generateReferralCode', () => {
  it('produces a 10-char code (DH + 8) of safe characters', () => {
    const code = generateReferralCode()
    expect(code).toMatch(/^DH[A-Z2-9]{8}$/)
    expect(code.length).toBe(10)
  })
  it('salt becomes an uppercase 4-char seed, codes remain unique', () => {
    const a = generateReferralCode('abc')
    const b = generateReferralCode('abc')
    expect(a).not.toBe(b)
    expect(a.startsWith('DHABC')).toBe(true)
    expect(b.startsWith('DHABC')).toBe(true)
  })
})