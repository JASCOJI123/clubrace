import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Telegram Mini App authentication — server-side initData verification.
 *
 * Spec §40 / Telegram docs: the frontend sends raw `initData`; the backend must
 * verify the HMAC signature itself. `initDataUnsafe` is NEVER trusted.
 *
 * Algorithm (core.telegram.org):
 *   1. secret_key = HMAC_SHA256(key = "WebAppData", message = bot_token)
 *   2. data_check_string = sorted (key=value) pairs of initData, excluding `hash`,
 *      joined with "\n", values URL-decoded once
 *   3. hash = hex( HMAC_SHA256(secret_key, data_check_string) )
 *   4. compare with the `hash` field using a constant-time comparison
 */

export interface TelegramInitData {
  queryId?: string
  userJson: string
  authDate?: number
  hash: string
  startParam?: string
  chatInstance?: string
  raw: string
}

export interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface TelegramAuthResult {
  user: TelegramUser
  authDate: number
  valid: boolean
  startParam?: string
}

export function parseInitData(raw: string): TelegramInitData {
  const params = new URLSearchParams(raw)
  const userJson = params.get('user') ?? ''
  if (!userJson) {
    throw new Error('TEL_INITDATA_MISSING_USER')
  }
  return {
    queryId: params.get('query_id') ?? undefined,
    userJson,
    authDate: params.get('auth_date') ? Number(params.get('auth_date')) : undefined,
    hash: params.get('hash') ?? '',
    startParam: params.get('start_param') ?? undefined,
    chatInstance: params.get('chat_instance') ?? undefined,
    raw,
  }
}

/** Builds the data_check_string from a Telegram initData query string. */
export function buildDataCheckString(raw: string): string {
  const pairs = raw.split('&').map((pair) => {
    const eq = pair.indexOf('=')
    if (eq === -1) return [pair, ''] as const
    return [pair.slice(0, eq), pair.slice(eq + 1)] as const
  })
  // exclude `hash`, sort alphabetically, decode values once
  return pairs
    .filter(([k]) => k !== 'hash')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${decodeURIComponent(v)}`)
    .join('\n')
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export interface ValidateOptions {
  botToken: string
  /** Reject initData older than this many seconds (Telegram recommends 86400). */
  maxAgeSeconds?: number
  /** For unit tests: allow overriding the clock. */
  now?: () => number
}

/**
 * Validates raw initData. Returns the auth result on success, or
 * throws `TelegramAuthError` with a machine-readable code.
 */
export function validateTelegramInitData(
  raw: string,
  { botToken, maxAgeSeconds = 86_400, now = () => Math.floor(Date.now() / 1000) }: ValidateOptions
): TelegramAuthResult {
  if (!raw) throw new TelegramAuthError('TEL_INITDATA_EMPTY', 'initData is empty')
  if (!botToken) throw new TelegramAuthError('TEL_BOT_TOKEN_MISSING', 'BOT_TOKEN is not configured')

  const parsed = parseInitData(raw)
  if (!parsed.hash) throw new TelegramAuthError('TEL_INITDATA_NO_HASH', 'initData has no hash')

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const checkString = buildDataCheckString(raw)
  const computed = createHmac('sha256', secret).update(checkString).digest()
  const provided = Buffer.from(parsed.hash, 'hex')

  if (!safeEqual(computed, provided)) {
    throw new TelegramAuthError('TEL_INITDATA_INVALID_SIG', 'initData signature mismatch')
  }

  const authDate = parsed.authDate
  if (authDate === undefined) {
    throw new TelegramAuthError('TEL_INITDATA_NO_DATE', 'initData has no auth_date')
  }
  const age = now() - authDate
  if (age > maxAgeSeconds) {
    throw new TelegramAuthError('TEL_INITDATA_EXPIRED', 'initData is too old')
  }

  const user = JSON.parse(parsed.userJson) as TelegramUser
  if (!user || typeof user.id !== 'number') {
    throw new TelegramAuthError('TEL_USER_INVALID', 'user payload is invalid')
  }

  return { user, authDate, valid: true, startParam: parsed.startParam }
}

export class TelegramAuthError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'TelegramAuthError'
    this.code = code
  }
}

/**
 * Generate a short referral code for a user. Only A-Z0-9 (safe in ?start=).
 * Shape: 'DH' + 4 seed chars + 4 random chars (10 total).
 * An optional `salt` (e.g. user id) makes the seed prefix deterministic-ish.
 */
export function generateReferralCode(salt = ''): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const randomChars = (n: number): string => {
    const buf = globalThis.crypto.getRandomValues(new Uint8Array(n))
    let s = ''
    for (const b of buf) s += alphabet[b % alphabet.length]
    return s
  }
  if (!salt) return `DH${randomChars(8)}`
  const seed = salt.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4)
  const prefix = seed || 'DHUB'
  return `DH${prefix}${randomChars(4)}`
}

/**
 * Telegram's `setWebhook` secret_token only allows `A-Za-z0-9_-` (1-256 chars) —
 * see https://core.telegram.org/bots/api#setwebhook. PaaS-generated secrets
 * (e.g. Render's `generateValue: true`) are typically base64 and contain
 * `+ / =`, which Telegram rejects with "secret token contains illegal characters".
 *
 * This deterministically maps ANY input string to a safe token by converting
 * standard base64 to base64url and stripping padding/anything else disallowed.
 * Same input always produces the same output, so it's safe to call both when
 * registering the webhook and when verifying incoming requests.
 */
export function sanitizeWebhookSecret(raw: string): string {
  const safe = raw
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
  return safe.slice(0, 256)
}