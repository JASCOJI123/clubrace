import { prisma } from '@driverhub/database'
import { computePeriod, money, sum } from '@driverhub/ai'
import type { JobHandlers } from '../queue.js'

/**
 * Weekly / monthly driver reports (spec §17, M7).
 * Honest rules:
 *  - only drivers who opted into `shareWeekly` OR actually have data get a report;
 *  - a driver with zero records in the period gets NO row (no fabricated numbers);
 *  - rows are created as Notification (type WEEKLY_REPORT / MONTHLY_REPORT) and
 *    pushed by the notification dispatcher.
 */

export function reportJobHandlers(): JobHandlers {
  return {
    generate_weekly_report: async () => {
      await generatePeriodic('WEEKLY_REPORT', 'weekly')
    },
    generate_monthly_report: async () => {
      await generatePeriodic('MONTHLY_REPORT', 'monthly')
    },
  }
}

type Period = 'weekly' | 'monthly'

async function generatePeriodic(type: 'WEEKLY_REPORT' | 'MONTHLY_REPORT', period: Period): Promise<void> {
  const now = new Date()
  const start = period === 'weekly' ? daysAgo(now, 7) : daysAgo(now, 30)

  // Drivers eligible: not banned/deleted and actually had records in the period
  // (a driver with zero records gets NO row — no fabricated numbers).
  const eligible = await prisma.driver.findMany({
    where: { user: { deletedAt: null, isBanned: false } },
    select: {
      userId: true,
      user: { select: { name: true } },
    },
  })

  let created = 0
  for (const driver of eligible) {

    const [incomeRows, expenseRows, sessions] = await Promise.all([
      prisma.incomeRecord.findMany({
        where: { userId: driver.userId, deletedAt: null, date: { gte: start, lte: new Date() } },
        select: { amount: true, date: true, tripCount: true },
      }),
      prisma.expenseRecord.findMany({
        where: { userId: driver.userId, deletedAt: null, date: { gte: start, lte: new Date() } },
        select: { amount: true, date: true },
      }),
      prisma.workSession.findMany({ where: { userId: driver.userId }, select: { startedAt: true, endedAt: true } }),
    ])

    const rows = computePeriod(
      {
        income: incomeRows,
        expenses: expenseRows,
        sessions: sessions as { startedAt: Date; endedAt?: Date | null }[],
        startDate: start,
        endDate: new Date(),
      },
    )
    if (incomeRows.length === 0 && expenseRows.length === 0) continue

    const income = sum(incomeRows.map((r) => r.amount))
    const expenses = sum(expenseRows.map((r) => r.amount))
    const hours = rows.hours
    const name = driver.user?.name ?? 'Haydovchi'

    const body =
      period === 'weekly'
        ? `${name}, hafta natijalaringiz: daromad ${money(income)}, xarajat ${money(expenses)}, sof ${money(income - expenses)}, ${hours} soat.`
        : `${name}, oy natijalaringiz: daromad ${money(income)}, xarajat ${money(expenses)}, sof ${money(income - expenses)}, ${hours} soat.`

    await prisma.notification.create({
      data: { userId: driver.userId, type, title: period === 'weekly' ? 'Haftalik hisobot' : 'Oylik hisobot', body },
    })
    created++
  }
  console.log(`[worker] ${type}: ${created} ta hisobot yaratildi`)
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 86_400_000)
}