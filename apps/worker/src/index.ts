import cron from 'node-cron'
import { getEnv } from './env.js'
import { createJobQueue } from './queue.js'
import { notificationJobHandlers } from './jobs/notifications.js'
import { reportJobHandlers } from './jobs/reports.js'
import { scoreJobHandlers } from './jobs/scores.js'
import { lifecycleJobHandlers } from './jobs/lifecycle.js'

/**
 * DRIVER HUB background worker (spec §33, M7).
 *
 * Jobs (BullMQ with REDIS_URL; in-process in-memory fallback otherwise):
 *   send_notification, dispatch_notifications, generate_weekly_report,
 *   generate_monthly_report, maintenance_reminder, goal_reminder,
 *   subscription_expiry, calculate_driver_score, update_analytics,
 *   process_referral_reward, cleanup_expired_data
 *
 * Cron gates the push-style jobs (dispatch every minute; reports/score/cleanup
 * on the configurable schedules from @driverhub/config).
 */

const CRON = {
  /** dispatch pending notifications */
  DISPATCH: '* * * * *',
  /** daily at 00:38 (worker cron from env) */
  DAILY: (v: string) => v,
  /** hourly at :07 (env) */
  HOURLY: (v: string) => v,
}

async function main() {
  const env = getEnv()

  // `add` is forward-declared: the queue hands notificationJobHandlers a wrapper
  // that calls this same `add` at job-run time (by then it is assigned).
  let add: (name: string, data: unknown, opts?: { delayMs?: number }) => Promise<string>

  const handlers = {
    ...notificationJobHandlers({ add: (name, data) => add(name, data) }),
    ...reportJobHandlers(),
    ...scoreJobHandlers(),
    ...lifecycleJobHandlers(),
  }

  const queue = createJobQueue(env, handlers)
  add = (name, data, opts) => queue.add(name, data, opts)

  console.log(
    `[worker] starting — queue engine: ${queue.usingRedis ? 'BullMQ (Redis)' : 'in-memory (REDIS_URL not set)'}; ` +
      `TELEGRAM_BOT_TOKEN ${env.TELEGRAM_BOT_TOKEN ? 'set' : 'MISSING (pushes skipped)'}`
  )

  // ---- cron schedules ----
  const tasks: { stop: () => void }[] = []

  // 1. Notification dispatch — run constantly (quiet hours handled per-user).
  tasks.push(
    cron.schedule(CRON.DISPATCH, () => {
      void queue.add('dispatch_notifications', {}).catch((e) => console.error('[worker] dispatch cron failed', e))
    })
  )

  // 2. Weekly + monthly reports — daily gate decides which to run.
  tasks.push(
    cron.schedule(CRON.DAILY(env.WORKER_CRON_REPORTS_DAILY), async () => {
      const now = new Date()
      const isMonday = now.getDay() === 1
      const isFirstOfMonth = now.getDate() === 1
      if (isMonday) await add('generate_weekly_report', {})
      if (isFirstOfMonth) await add('generate_monthly_report', {})
      await add('maintenance_reminder', {})
      await add('goal_reminder', {})
      await add('subscription_expiry', {})
      await add('process_referral_reward', {})
      await add('cleanup_expired_data', {})
    })
  )

  // 3. Score recompute — hourly.
  tasks.push(
    cron.schedule(CRON.HOURLY(env.WORKER_CRON_SCORE_HOURLY), () => {
      void add('calculate_driver_score', {}).catch((e) => console.error('[worker] score cron failed', e))
    })
  )

  console.log(`[worker] schedules — dispatch: "${CRON.DISPATCH}", reports/lifecycle: "${CRON.DAILY(env.WORKER_CRON_REPORTS_DAILY)}", score: "${CRON.HOURLY(env.WORKER_CRON_SCORE_HOURLY)}"`)

  // run one dispatch immediately so pending notifications flush on boot
  await queue.add('dispatch_notifications', {})

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} — closing queue + cron`)
    tasks.forEach((t) => t.stop())
    await queue.close()
    process.exit(0)
  }
  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

void main()