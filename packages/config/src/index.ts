import { z } from 'zod'

/**
 * Central env/config package. Loaded once per process.
 * Fail-lenient in development (sensible defaults), strict in production
 * (missing critical values throw at boot — never silently).
 */

const boolFromAny = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'))

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('Driver Hub'),

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBAPP_URL: z.string().default('https://driverhub.example.com'),

  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),

  AI_PROVIDER: z.enum(['deterministic', 'anthropic']).default('deterministic'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-sonnet-5'),
  AI_MAX_DAILY_QUERIES: z.coerce.number().default(50),

  PAYMENT_PROVIDER: z.enum(['none', 'local', 'telegram_stars']).default('none'),
  PAYMENT_PROVIDER_KEY: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),

  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().optional(),

  ADMIN_EMAIL: z.string().default('admin@driverhub.uz'),
  ADMIN_PASSWORD: z.string().default('ChangeMe_12345'),

  DEMO_MODE: boolFromAny.default(false),

  API_PORT: z.coerce.number().default(4000),
  API_HOST: z.string().default('0.0.0.0'),

  WORKER_CRON_REPORTS_DAILY: z.string().default('38 0 * * *'),
  WORKER_CRON_SCORE_HOURLY: z.string().default('7 * * * *'),
  DEFAULT_MARKETPLACE_COMMISSION_PERCENT: z.coerce.number().default(3),
})

export type Env = z.infer<typeof envSchema>

let cache: Env | null = null

export function loadEnv(overrides?: Partial<Record<string, string>>): Env {
  if (cache && !overrides) return cache
  const source = { ...process.env, ...overrides }
  const strict = source.NODE_ENV === 'production'
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => i.path.join('.'))
      .filter((p) => p !== 'DATABASE_URL' || strict)
    if (strict && missing.length > 0) {
      throw new Error(`Invalid environment: ${missing.join(', ')}`)
    }
    // dev: fall back to a default env so the app boots with annotations on screen
    const defaults = envSchema.parse({ DATABASE_URL: 'postgresql://driverhub:driverhub@localhost:5432/driverhub?schema=public' })
    cache = { ...defaults, ...(parsed.data as unknown as Partial<Env>) }
    return cache
  }
  cache = parsed.data
  return cache
}

export function getEnv(): Env {
  if (!cache) return loadEnv()
  return cache
}

/** Derived feature flags, used across API/bot/worker/web. */
export function getFlags(env: Env = getEnv()) {
  return {
    aiProvider: env.AI_PROVIDER,
    aiAvailable: env.AI_PROVIDER === 'anthropic' && !!env.AI_API_KEY,
    paymentsEnabled: env.PAYMENT_PROVIDER !== 'none' && !!env.PAYMENT_PROVIDER_KEY,
    demoMode: env.DEMO_MODE,
    telegramLive: !!env.TELEGRAM_BOT_TOKEN,
    storageProvider: env.STORAGE_PROVIDER,
    redisAvailable: !!env.REDIS_URL,
  }
}

/** CORS origins list -> { origin: boolean } for Fastify cors. */
export function corsOrigins(env: Env = getEnv()): string[] {
  return env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
}