import { prisma } from '@driverhub/database'
import type { Telegraf } from 'telegraf'

/**
 * Notification sender (spec §22). The worker (M7) calls `deliver` as it dispatches
 * `send_notification` jobs; the bot also uses it for instant messages.
 *
 * Honest delivery rules:
 * - only sends when the user has `telegramEnabled` and is NOT in quiet hours
 * - marks the DB Notification row SENT / FAILED after the attempt
 * - never throws into the caller — delivery failures are logged via the bot logger
 */

interface QuietHours {
  start: number | null
  end: number | null
}

export function inQuietHours(now: Date, { start, end }: QuietHours): boolean {
  if (start === null || end === null || start === end) return false
  const minutes = now.getHours() * 60 + now.getMinutes()
  // start..end is taken from the DB as minutes-from-midnight (end may wrap).
  if (start <= end) return minutes >= start && minutes < end
  // wrap across midnight
  return minutes >= start || minutes < end
}

/**
 * Build a sender for one notification row. Returns the message text to send,
 * or null when the user has opted out / is in quiet hours.
 */
export async function planNotification(bot: Telegraf, notificationId: string): Promise<{ chatId: number; text: string } | null> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } })
  if (!notification || notification.status === 'SENT' || notification.status === 'FAILED') return null

  const user = await prisma.user.findUnique({ where: { id: notification.userId } })
  if (!user || !user.telegramId || user.isBanned || user.isSuspended || user.deletedAt) {
    await prisma.notification.update({ where: { id: notificationId }, data: { status: 'SKIPPED' } }).catch(() => {})
    return null
  }

  const prefs = await prisma.notificationPreference.findUnique({ where: { userId: user.id } }).catch(() => null)
  if (prefs && prefs.telegramEnabled === false) {
    await prisma.notification.update({ where: { id: notificationId }, data: { status: 'SKIPPED' } }).catch(() => {})
    return null
  }
  if (prefs && inQuietHours(new Date(), { start: prefs.quietHoursStart, end: prefs.quietHoursEnd })) {
    // Keep it PENDING — retried when quiet hours end (worker).
    return null
  }

  const title = notification.title ? `🔔 ${notification.title}\n` : ''
  return { chatId: Number(user.telegramId), text: `${title}${notification.body ?? ''}`.trim() }
}

/** Send one notification row via the bot. Best-effort; never throws. */
export async function deliverNotification(bot: Telegraf, notificationId: string, log: Console = console): Promise<boolean> {
  try {
    const planned = await planNotification(bot, notificationId)
    if (!planned || planned.text.length === 0) return false
    await bot.telegram.sendMessage(planned.chatId, planned.text, { link_preview_options: { is_disabled: true } })
    await prisma.notification
      .update({ where: { id: notificationId }, data: { status: 'SENT', sentAt: new Date() } })
      .catch(() => {})
    return true
  } catch (err) {
    log.error({ notificationId, err: (err as Error).message }, 'notification delivery failed')
    await prisma.notification.update({ where: { id: notificationId }, data: { status: 'FAILED' } }).catch(() => {})
    return false
  }
}

/** Raw best-effort Telegram push (used by bot commands, bypasses Notification rows). */
export async function pushMessage(bot: Telegraf, telegramId: bigint, text: string): Promise<boolean> {
  try {
    await bot.telegram.sendMessage(Number(telegramId), text, { link_preview_options: { is_disabled: true } })
    return true
  } catch {
    return false
  }
}

