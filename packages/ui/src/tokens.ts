/**
 * DRIVER HUB — design tokens (dark premium fintech, spec §49).
 *
 * Exposed two ways:
 *  - as CSS custom properties via `@driverhub/ui/style.css` for the Tailwind theme,
 *  - as a JS object (`tokens`) for inline styles in the WebView.
 *
 * The Mini App runs inside Telegram on any device, so every color needs a
 * dark-on-dark contrast pair that survives both light and dark host themes —
 * we pin our own dark palette and never rely on the host's.
 *
 * `accent2` is the app's "premium / hero" hue (AI recommendations, driver
 * score, the daily-profit hero card). It intentionally reads as an electric,
 * automotive blue rather than a generic SaaS purple — grounded in the
 * driver's own world (headlights, dashboards, night driving) rather than a
 * default brand color.
 */

export const tokens = {
  color: {
    bg: '#0B0F1A',
    surface: '#141B2C',
    surface2: '#1B2438',
    surface3: '#232E46',
    border: 'rgba(255,255,255,0.07)',
    borderStrong: 'rgba(255,255,255,0.14)',
    text: '#F4F6FB',
    textSecondary: '#9AA4B8',
    textMuted: '#6B7690',
    accent: '#2BD9A3', // earnings / positive
    accentStrong: '#16C68C',
    accent2: '#2F6FED', // premium / AI / hero — electric blue
    accent2Strong: '#1B54D6',
    info: '#38BDF8',
    warning: '#FFB020',
    danger: '#FF5D6C',
    dangerBg: 'rgba(255,93,108,0.12)',
    successBg: 'rgba(43,217,163,0.12)',
    warningBg: 'rgba(255,176,32,0.14)',
    infoBg: 'rgba(56,189,248,0.12)',
    accent2Bg: 'rgba(47,111,237,0.16)',
    overlay: 'rgba(4,7,13,0.72)',
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
  font: { sans: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif" },
  shadow: {
    card: '0 6px 24px rgba(0,0,0,0.28)',
    glow: '0 0 0 1px rgba(43,217,163,0.4), 0 8px 30px rgba(43,217,163,0.25)',
    glow2: '0 0 0 1px rgba(47,111,237,0.45), 0 8px 30px rgba(47,111,237,0.3)',
    elevated: '0 16px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  // Creative gradient surfaces for hero cards (balance, CTA, icon badges) —
  // keep flat surfaces (tokens.color.surface) for regular content cards so
  // gradients stay a deliberate accent, not the default look everywhere.
  gradient: {
    accent2: 'linear-gradient(150deg, #3B82F6 0%, #2554D9 55%, #12309E 100%)',
    accent: 'linear-gradient(150deg, #26D9A0 0%, #159C77 60%, #0F8F6B 100%)',
    warning: 'linear-gradient(150deg, #FFD36B 0%, #E0A020 60%, #C4841A 100%)',
    danger: 'linear-gradient(145deg, #FF6B6B, #D83030)',
    info: 'linear-gradient(145deg, #4DA3FF, #1D6FE0)',
    surface: 'linear-gradient(160deg, #1B2438, #141A2B)',
  },
} as const

export type ThemeTokens = typeof tokens
export default tokens
