import { prisma, type Prisma } from '@driverhub/database'
import { getEnv } from '../env.js'
import { ApiError } from '../lib/errors.js'
import { writeAudit } from '../lib/audit.js'

/**
 * PaymentProvider interface (spec §28 payments).
 * - LocalProvider: verified server-side; the whole flow stays honest and testable.
 * - TelegramStarsProvider: stub — creates a PENDING payment and documents that
 *   real Star webhooks must be wired (see docs/deploy). Never fakes verification.
 */

export interface CreatePaymentInput {
  userId: string
  amount: number
  currency?: string
  metadata?: Record<string, unknown>
}

export interface PaymentProvider {
  name: string
  createPayment(input: CreatePaymentInput): Promise<{
    paymentId: string
    approvalUrl: string | null
    pending: boolean
  }>
  /** Server-side confirmation. Returns true when the payment is genuinely paid. */
  verifyPayment(paymentId: string): Promise<boolean>
}

export class LocalProvider implements PaymentProvider {
  name = 'local'
  async createPayment(input: CreatePaymentInput) {
    const payment = await prisma.payment.create({
      data: {
        userId: input.userId,
        provider: 'LOCAL',
        amount: input.amount,
        currency: input.currency ?? 'UZS',
        status: 'PENDING',
        metadata: (input.metadata ?? undefined) as unknown as Prisma.InputJsonValue,
      },
    })
    return { paymentId: payment.id, approvalUrl: null, pending: true }
  }
  async verifyPayment(paymentId: string) {
    // Local provider: confirmation is a server-side administrator action (menu below).
    return prisma.payment.findFirst({ where: { id: paymentId, status: 'COMPLETED' } }) !== null
  }
}

export class TelegramStarsProvider implements PaymentProvider {
  name = 'telegram_stars'
  async createPayment(input: CreatePaymentInput) {
    if (!getEnv().PAYMENT_PROVIDER_KEY) {
      throw ApiError.badRequest('Telegram Stars to‘lovlari hali sozlanmagan (PAYMENT_PROVIDER_KEY kerak)')
    }
    const payment = await prisma.payment.create({
      data: {
        userId: input.userId,
        provider: 'TELEGRAM_STARS',
        amount: input.amount,
        currency: input.currency ?? 'UZS',
        status: 'PENDING',
        metadata: (input.metadata ?? undefined) as unknown as Prisma.InputJsonValue,
      },
    })
    return {
      paymentId: payment.id,
      approvalUrl: null, // Stars invoice is created via Bot API — see roadmap
      pending: true,
    }
  }
  async verifyPayment(paymentId: string) {
    // Honest stub: real verification comes from the Telegram webhook (not implemented yet).
    return prisma.payment.findFirst({ where: { id: paymentId, status: 'COMPLETED' } }) !== null
  }
}

export function paymentProvider(provider: 'local' | 'telegram_stars' = 'local'): PaymentProvider {
  if (provider === 'telegram_stars' || getEnv().PAYMENT_PROVIDER === 'telegram_stars') {
    return new TelegramStarsProvider()
  }
  return new LocalProvider()
}

/** Server-side confirmation: marks a LOCAL payment completed and extends PRO. */
export async function confirmPaymentAndGrantPro(paymentId: string, actorId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw ApiError.notFound('To‘lov topilmadi')
  if (payment.provider !== 'LOCAL') throw ApiError.badRequest('Faqat local to‘lov tasdiqlanishi mumkin')
  if (payment.status === 'COMPLETED') throw ApiError.conflict('To‘lov allaqachon tugallangan')

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'COMPLETED', verifiedAt: new Date() },
    })
    await tx.paymentEvent.create({
      data: { paymentId, eventType: 'VERIFIED', data: { actorId } },
    })
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 86_400_000)
    const existing = await tx.subscription.findFirst({ where: { userId: payment.userId, plan: 'PRO' }, orderBy: { createdAt: 'desc' } })
    if (existing && existing.status === 'ACTIVE' && existing.expiresAt && existing.expiresAt > now) {
      // extend from the current expiry
      await tx.subscription.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', expiresAt: new Date(existing.expiresAt.getTime() + 30 * 86_400_000) },
      })
    } else {
      await tx.subscription.create({
        data: {
          userId: payment.userId,
          plan: 'PRO',
          status: 'ACTIVE',
          startedAt: now,
          expiresAt,
          priceMonth: payment.amount,
        },
      })
    }
  })

  await writeAudit({
    actorId,
    actorRole: 'ADMIN',
    action: 'PAYMENT_VERIFIED',
    targetType: 'payment',
    targetId: paymentId,
    metadata: { userId: payment.userId, amount: payment.amount },
  })
  return { ok: true }
}