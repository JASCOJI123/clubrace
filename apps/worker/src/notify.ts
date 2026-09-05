import { Telegram } from 'telegraf'
import { prisma } from '@driverhub/database'
import { getEnv } from './env.js'

/**
 * Worker-side notification sender (spec §22). Mirrors the bot's delivery rules
 * (apps/bot/src/notify.ts) so the worker — the primary dispatcher — applies the
 * same honest policy:
 *  - skip when the user opted out (telegramEnabled=false) → SKIPPED
 *  - keep PENDING during quiet hours (retried by the next dispatch tick)
 *  - SENT / FAILED after the Telegram attempt; never throws to the caller.
 */

interface QuietHours {
  start: number | null
  end: number | null
}

export function inQuietHours(now: Date, { start, end }: QuietHours): boolean {
  if (start === null || end === null || start === end) return false
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (start <= end) return minutes >= start && minutes < end
  // wrap across midnight
  return minutes >= start || minutes < end
}

let _api: Telegram | null = null

/** Lazily-created Telegram API client (disabled when no bot token). */
export function telegramApi(): Telegram | null {
  const env = getEnv()
  if (!env.TELEGRAM_BOT_TOKEN) {
    if (_api === null) {
      // remember we already warned once
      console.warn('[worker] TELEGRAM_BOT_TOKEN not set — notification pushes skipped (rows still created/queued)')
      _api = undefined as unknown as Telegram
    }
    return _api === undefined ? null : _api
  }
  if (_api === undefined || _api === null) _api = new Telegram(env.TELEGRAM_BOT_TOKEN)
  return _api
}

/**
 * Deliver one pending notification row. Returns true when a message was sent.
 * Honest: same rules as the bot's `deliverNotification`.
 */
export async function deliverOne(notificationId: string, log: Console = console): Promise<boolean> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } })
  if (!notification || notification.status === 'SENT' || notification.status === 'FAILED') return false

  const user = await prisma.user.findUnique({ where: { id: notification.userId } })
  if (!user || !user.telegramId || user.isBanned || user.isSuspended || user.deletedAt) {
    await prisma.notification
      .update({ where: { id: notificationId }, data: { status: 'SKIPPED' } })
      .catch(() => {})
    return false
  }

  const prefs = await prisma.notificationPreference.findUnique({ where: { userId: user.id } }).catch(() => null)
  if (prefs && prefs.telegramEnabled === false) {
    await prisma.notification
      .update({ where: { id: notificationId }, data: { status: 'SKIPPED' } })
      .catch(() => {})
    return false
  }
  if (prefs && inQuietHours(new Date(), { start: prefs.quietHoursStart, end: prefs.quietHoursEnd })) {
    return false // still PENDING → retried next tick when quiet hours end
  }

  const api = telegramApi()
  if (!api) {
    // No token: leave PENDING (a future run with a token will deliver).
    return false
  }

  const title = notification.title ? `🔔 ${notification.title}\n` : ''
  const text = `${title}${notification.body ?? ''}`.trim()
  if (!text) return false

  try {
    await api.sendMessage(Number(user.telegramId), text, { link_preview_options: { is_disabled: true } })
    await prisma.notification
      .update({ where: { id: notificationId }, data: { status: 'SENT', sentAt: new Date() } })
      .catch(() => {})
    return true
  } catch (err) {
    log.error(`[worker] notification delivery failed ${notificationId}: ${(err as Error)?.message ?? err}`)
    await prisma.notification
      .update({ where: { id: notificationId }, data: { status: 'FAILED' } })
      .catch(() => {})
    return false
  }
}