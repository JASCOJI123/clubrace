import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

// Route-level smoke tests via fastify.inject — NO live database required
// (routes are registered before any handler touches Prisma).

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('NODE_ENV') || key === 'DATABASE_URL') delete process.env[key]
  }
})

describe('API surface (no DB)', () => {
  it('GET /health returns ok', async () => {
    process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/driverhub'
    const app = buildApp({ logger: false })
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('ok')
    await app.close()
  })

  it('POST /api/auth/telegram: missing initData -> 400, invalid HMAC -> 401', async () => {
    process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/driverhub'
    process.env.TELEGRAM_BOT_TOKEN = '123456:test-token'
    const app = buildApp({ logger: false })
    const missing = await app.inject({ method: 'POST', url: '/api/auth/telegram', payload: {} })
    expect(missing.statusCode).toBe(400)
    const garbage = await app.inject({ method: 'POST', url: '/api/auth/telegram', payload: { initData: 'auth_date=1' } })
    expect(garbage.statusCode).toBe(401)
    // standard error envelope: { success:false, error:{ code, message } }
    expect(garbage.json().error.message).toBeTruthy()
    await app.close()
  })

  it('dev-login is gated off unless DEMO_MODE and non-production', async () => {
    process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/driverhub'
    process.env.DEMO_MODE = 'false'
    const app = buildApp({ logger: false })
    const res = await app.inject({ method: 'POST', url: '/api/auth/dev-login', payload: {} })
    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('driver routes require auth (401, not a crash)', async () => {
    process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/driverhub'
    const app = buildApp({ logger: false })
    const res = await app.inject({ method: 'GET', url: '/api/me' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('unknown API routes return a JSON 404 (SPA fallback never swallows /api)', async () => {
    process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/driverhub'
    const app = buildApp({ logger: false })
    const res = await app.inject({ method: 'GET', url: '/api/definitely-not-a-route' })
    expect(res.statusCode).toBe(404)
    expect(res.headers['content-type']).toContain('application/json')
    await app.close()
  })

  it('swagger UI is served at /docs', async () => {
    process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/driverhub'
    const app = buildApp({ logger: false })
    const res = await app.inject({ method: 'GET', url: '/docs' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    await app.close()
  })
})