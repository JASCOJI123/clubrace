import { describe, expect, it } from 'vitest'
import { loadEnv, getFlags, corsOrigins } from './index.js'

// loadEnv(overrides) always re-parses (never hits the module cache), so these
// tests are hermetic regardless of CI's real process.env.

const base = { DATABASE_URL: 'postgresql://x:x@localhost:5432/driverhub' }

describe('loadEnv', () => {
  it('applies development defaults', () => {
    // NODE_ENV comes from the shell (vitest sets "test"); pass it explicitly
    // so the assertion is about the default, not the ambient env.
    const env = loadEnv({ ...base, NODE_ENV: 'development' })
    expect(env.NODE_ENV).toBe('development')
    expect(env.APP_NAME).toBe('Driver Hub')
    expect(env.AI_PROVIDER).toBe('deterministic')
    expect(env.PAYMENT_PROVIDER).toBe('none')
    expect(env.DEMO_MODE).toBe(false)
    expect(env.API_PORT).toBe(4000)
  })

  it('coerces booleans from strings ("true"/"false")', () => {
    expect(loadEnv({ ...base, DEMO_MODE: 'false' }).DEMO_MODE).toBe(false)
    expect(loadEnv({ ...base, DEMO_MODE: 'true' }).DEMO_MODE).toBe(true)
  })

  it('coerces numeric strings (API_PORT)', () => {
    expect(loadEnv({ ...base, API_PORT: '5000' }).API_PORT).toBe(5000)
  })

  it('is strict in production: throws on missing DATABASE_URL', () => {
    expect(loadEnv({ ...base, NODE_ENV: 'production' }).NODE_ENV).toBe('production')
    // Production without DATABASE_URL is the critical failure — must throw,
    // never silently fall back to dev defaults.
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow()
  })

  it('returns a usable (dev) env even when DATABASE_URL is missing', () => {
    const env = loadEnv({})
    expect(env.DATABASE_URL).toContain('localhost:5432')
  })
})

describe('feature flags (never fake availability)', () => {
  it('AI chat is available only with anthropic + API key', () => {
    expect(getFlags(loadEnv({ ...base, AI_PROVIDER: 'deterministic' })).aiAvailable).toBe(false)
    expect(getFlags(loadEnv({ ...base, AI_PROVIDER: 'anthropic' })).aiAvailable).toBe(false)
    expect(getFlags(loadEnv({ ...base, AI_PROVIDER: 'anthropic', AI_API_KEY: 'sk-abc' })).aiAvailable).toBe(true)
  })

  it('payments are enabled only with provider + key', () => {
    expect(getFlags(loadEnv({ ...base, PAYMENT_PROVIDER: 'local' })).paymentsEnabled).toBe(false)
    expect(getFlags(loadEnv({ ...base, PAYMENT_PROVIDER: 'local', PAYMENT_PROVIDER_KEY: 'k' })).paymentsEnabled).toBe(true)
  })

  it('telegram live requires a bot token', () => {
    expect(getFlags(loadEnv({ ...base, TELEGRAM_BOT_TOKEN: undefined })).telegramLive).toBe(false)
    expect(getFlags(loadEnv({ ...base, TELEGRAM_BOT_TOKEN: '123:ABC' })).telegramLive).toBe(true)
  })
})

describe('corsOrigins', () => {
  it('splits and trims the comma list', () => {
    expect(corsOrigins(loadEnv({ ...base }))).toEqual(['http://localhost:5173', 'http://localhost:5174'])
    expect(corsOrigins(loadEnv({ ...base, CORS_ORIGINS: 'https://a.example.com, https://b.example.com' }))).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ])
  })
})