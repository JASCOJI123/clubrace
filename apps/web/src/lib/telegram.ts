/**
 * Telegram Mini App SDK bridge + browser mock (spec §41).
 *
 * Inside Telegram the windows.Telegram.WebApp object is injected by the
 * telegram-web-app.js script loaded in index.html. `initData` is the ONLY
 * piece we send to the API — it is HMAC-signed by Telegram and validated
 * server-side; we never trust initDataUnsafe client-side.
 *
 * For browser development (no Telegram), setting VITE_TG_MOCK=1 injects a
 * shim so the whole app is previewable locally. The mock NEVER fabricates
 * driver data — it only provides Chat/SDK plumbing; a real (or demo) login
 * still comes from the API.
 */

export interface TgUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

export interface WebAppLike {
  initData: string
  initDataUnsafe: { user?: TgUser; start_param?: string }
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  ready: () => void
  expand: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  close: () => void
  hapticFeedback?: { notificationOccurred?: () => void; impactOccurred?: () => void }
  openTelegramLink?: (url: string) => void
  HapticFeedback?: {
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
  }
  version: string
  isExpanded?: boolean
  disableVerticalSwipes?: () => void
}

/** startapp value from initDataUnsafe — carries the referral code. */
export function getStartPayload(): string | undefined {
  return tg().initDataUnsafe?.start_param
}

let overridden: WebAppLike | null = null

/** Test / dev override — the browser mock sets this. */
export function setWebAppOverride(webapp: WebAppLike | null): void {
  overridden = webapp
}

/** Access the Telegram SDK, or null when running outside Telegram/browser-mock. */
function rawTg(): WebAppLike | null {
  const w = window as unknown as { Telegram?: { WebApp?: WebAppLike } }
  return (w.Telegram?.WebApp as WebAppLike | undefined) ?? overridden ?? null
}

export function tg(): WebAppLike {
  const w = rawTg()
  if (!w) throw new Error('Telegram WebApp mavjud emas')
  return w
}

export function inTelegram(): boolean {
  return rawTg() !== null
}

/** Whether we are the browser dev shim (VITE_TG_MOCK=1). */
export function isMock(): boolean {
  const w = window as unknown as { __TG_MOCK__?: boolean }
  return w.__TG_MOCK__ === true
}

/** Grab the signed initData string to send to /auth/telegram, or null. */
export function captureInitData(): string | null {
  try {
    return tg().initData || null
  } catch {
    return null // dev-standalone: no Telegram, no mock → drive via dev-login later
  }
}

/** Best-effort SDK niceties (idempotent, never throws). */
export function setupWebApp(): void {
  try {
    const webapp = rawTg()
    if (!webapp) return
    webapp.ready?.()
    webapp.expand?.()
    webapp.setHeaderColor?.('#0B0F1A')
    webapp.setBackgroundColor?.('#0B0F1A')
    if (webapp.disableVerticalSwipes) webapp.disableVerticalSwipes()
  } catch {
    /* browser dev without Telegram — fine */
  }
}

export function haptic(type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy'): void {
  try {
    const webapp = rawTg()
    if (!webapp) return
    const h = webapp.HapticFeedback
    if (!h) return
    if (type === 'success' || type === 'error' || type === 'warning') h.notificationOccurred(type)
    else h.impactOccurred(type)
  } catch {
    /* no-op */
  }
}

/**
 * Inject the browser dev shim when VITE_TG_MOCK=1 or when in a plain browser
 * with no Telegram SDK and no API connectivity issues expected. Start param
 * defaults to a dev referral code so the referral flow can be tested against
 * seeded data (`start_app=...` read from ?startapp=).
 */
export function installMockIfNeeded(): WebAppLike | null {
  const wantMock = import.meta.env.VITE_TG_MOCK === '1'
  if (!wantMock) return null
  if (rawTg()) return null // real SDK already present
  const params = new URLSearchParams(window.location.search)
  const startapp = params.get('startapp') ?? undefined
  const mock: WebAppLike = {
    initData: '', // empty initData signals "no Telegram" to the login flow
    initDataUnsafe: { start_param: startapp },
    colorScheme: 'dark',
    themeParams: {},
    version: '8.0',
    ready: () => {},
    expand: () => {},
    setHeaderColor: () => {},
    setBackgroundColor: () => {},
    close: () => {},
    disableVerticalSwipes: () => {},
    HapticFeedback: {
      notificationOccurred: () => {},
      impactOccurred: () => {},
    },
  }
  setWebAppOverride(mock)
  ;(window as unknown as { __TG_MOCK__?: boolean }).__TG_MOCK__ = true
  return mock
}