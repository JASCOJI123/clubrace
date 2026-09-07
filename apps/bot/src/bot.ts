import http from 'node:http'
import { Telegraf } from 'telegraf'
import { sanitizeWebhookSecret } from '@driverhub/telegram'
import { getEnv } from './env.js'
import { registerCommands } from './commands.js'
import { deliverNotification } from './notify.js'

/**
 * Driver Hub Telegram bot (spec §4).
 * Companion to the Mini App: /start referral links, profile/stats/goal/car cards,
 * support & help. Two run modes:
 *  - default: long-polling (dev, simple hosting)
 *  - WEBHOOK_URL set: register a webhook and serve it on this HTTP server
 */

/** `null` means the bot is disabled (no TELEGRAM_BOT_TOKEN) — dev convenience. */
export function createBot(): Telegraf | null {
  const env = getEnv()
  if (!env.TELEGRAM_BOT_TOKEN) {
    if (env.NODE_ENV === 'production') throw new Error('TELEGRAM_BOT_TOKEN is required in production')
    console.log('ℹ️  TELEGRAM_BOT_TOKEN not set — bot disabled (Mini App + API still work).')
    return null
  }

  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN)
  bot.catch((err, ctx) => {
    console.error('[bot] update error', (err as Error)?.message ?? err, 'update', ctx?.update?.update_id)
  })
  registerCommands(bot)
  return bot
}

async function main() {
  const env = getEnv()
  const bot = createBot()

  // Render (and similar PaaS) health-checks every "web" service by scanning for an
  // open $PORT. Bind this unconditionally — independent of webhook vs. long-polling —
  // so the very first deploy succeeds even before WEBHOOK_URL is configured.
  const port = Number(process.env.PORT ?? env.API_PORT + 1)
  const webhookUrl = env.WEBHOOK_URL

  if (!bot) {
    http
      .createServer((_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true, bot: 'disabled' }))
      })
      .listen(port, () => console.log(`🔌 Health server listening on :${port} (bot disabled)`))
    return
  }

  if (webhookUrl) {
    const fullWebhook = `${webhookUrl.replace(/\/$/, '')}/webhook`
    const secret = env.WEBHOOK_SECRET ? sanitizeWebhookSecret(env.WEBHOOK_SECRET) : undefined
    await bot.telegram.setWebhook(fullWebhook, secret ? { secret_token: secret } : {})
    console.log(`🔌 Bot webhook registered: ${fullWebhook}`)

    const handler = bot.webhookCallback('/webhook', secret ? { secretToken: secret } : {})
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      }
      void handler(req, res)
    })
    server.listen(port, () => console.log(`🔌 Bot webhook server listening on :${port}/webhook`))
    return
  }

  // Long polling: still bind a plain health server so Render's port scan passes.
  http
    .createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, mode: 'polling' }))
    })
    .listen(port, () => console.log(`🔌 Health server listening on :${port} (long polling mode)`))

  await bot.launch()
  console.log('🤖 Driver Hub bot is running (long polling) — Ctrl+C to stop')
}

void main()

const shutdown = async (signal: string) => {
  console.log(`[bot] ${signal} — stopping`)
  process.exit(0)
}
process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

export { deliverNotification }