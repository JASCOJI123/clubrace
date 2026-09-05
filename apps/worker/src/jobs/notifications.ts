import { prisma } from '@driverhub/database'
import type { JobHandlers } from '../queue.js'
import { deliverOne } from '../notify.js'

/**
 * Notification dispatch jobs:
 *  - `dispatch_notifications` → enqueues `send_notification` for each pending row
 *    (bounded batch so a flood never blocks the tick).
 *  - `send_notification`      → actually delivers one row (honest prefs/quiet-hours
 *    rules in notify.ts).
 */

export interface NotificationDeps {
  add: (name: string, data: unknown) => Promise<string>
}

export function notificationJobHandlers({ add }: NotificationDeps): JobHandlers {
  return {
    dispatch_notifications: async () => {
      const pending = await prisma.notification.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 100,
        select: { id: true },
      })
      for (const n of pending) {
        await add('send_notification', { notificationId: n.id })
      }
    },
    send_notification: async (data) => {
      const d = data as { notificationId?: string }
      if (!d.notificationId) return
      await deliverOne(d.notificationId)
    },
  }
}