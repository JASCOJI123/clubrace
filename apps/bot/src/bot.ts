import http from 'node:http'
import { Telegraf } from 'telegraf'
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
  if (!bot) return

  const webhookUrl = env.WEBHOOK_URL
  if (webhookUrl) {
    const fullWebhook = `${webhookUrl.replace(/\/$/, '')}/webhook`
    await bot.telegram.setWebhook(fullWebhook, env.WEBHOOK_SECRET ? { secret_token: env.WEBHOOK_SECRET } : {})
    console.log(`🔌 Bot webhook registered: ${fullWebhook}`)

    const handler = bot.webhookCallback('/webhook', env.WEBHOOK_SECRET ? { secretToken: env.WEBHOOK_SECRET } : {})
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      }
      void handler(req, res)
    })
    const port = Number(process.env.PORT ?? env.API_PORT + 1)
    server.listen(port, () => console.log(`🔌 Bot webhook server listening on :${port}/webhook`))
    return
  }

  // Default: long polling.
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