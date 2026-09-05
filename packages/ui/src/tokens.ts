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
    accent2: '#7C6CFF', // AI / premium
    accent2Strong: '#6A59F5',
    info: '#38BDF8',
    warning: '#FFB020',
    danger: '#FF5D6C',
    dangerBg: 'rgba(255,93,108,0.12)',
    successBg: 'rgba(43,217,163,0.12)',
    warningBg: 'rgba(255,176,32,0.14)',
    infoBg: 'rgba(56,189,248,0.12)',
    accent2Bg: 'rgba(124,108,255,0.14)',
    overlay: 'rgba(4,7,13,0.72)',
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
  font: { sans: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif" },
  shadow: {
    card: '0 6px 24px rgba(0,0,0,0.28)',
    glow: '0 0 0 1px rgba(43,217,163,0.4), 0 8px 30px rgba(43,217,163,0.25)',
    glow2: '0 0 0 1px rgba(124,108,255,0.4), 0 8px 30px rgba(124,108,255,0.28)',
  },
} as const

export type ThemeTokens = typeof tokens
export default tokens
