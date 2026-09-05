import { getEnv } from './env.js'
import { buildApp } from './app.js'

const env = getEnv()
const app = buildApp({ logger: true })

const port = Number(process.env.PORT ?? env.API_PORT)
const host = env.API_HOST

async function main() {
  try {
    await app.ready()
    await app.listen({ port, host })
    app.log.info(`🚕 Driver Hub API is live at http://${host}:${port} (docs: /docs)`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

void main()

// graceful shutdown
const shutdown = (signal: string) => {
  app.log.info({ signal }, 'shutting down')
  void app.close().then(() => process.exit(0))
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('unhandledRejection', (reason) => {
  app.log.error({ reason }, 'unhandled rejection')
})