/**
 * DRIVER HUB — shared UI kit (dark premium fintech, spec §49).
 *
 * Lightweight, dependency-free React primitives. The Mini App imports these
 * straight from TS source via Vite; the admin panel reuses the same kit.
 * Every component accepts the standard `className` and passes through `style`.
 */
import React from 'react'
import { tokens } from './tokens.js'
import { cx } from './cx.js'

export { tokens }

/* ------------------------------- typography ------------------------------ */

export function Text({
  as: Tag = 'span',
  variant = 'body',
  tone = 'text',
  className,
  ...rest
}: {
  as?: React.ElementType
  variant?: 'hero' | 'title' | 'subtitle' | 'body' | 'caption' | 'label'
  tone?: 'text' | 'secondary' | 'muted' | 'accent' | 'success' | 'danger' | 'warning'
  className?: string
} & React.HTMLAttributes<HTMLElement>) {
  const tones: Record<string, string> = {
    text: 'var(--dh-text)',
    secondary: 'var(--dh-text-secondary)',
    muted: 'var(--dh-text-muted)',
    accent: 'var(--dh-accent)',
    success: 'var(--dh-accent)',
    danger: 'var(--dh-danger)',
    warning: 'var(--dh-warning)',
  }
  const variants: Record<string, React.CSSProperties> = {
    hero: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5 },
    title: { fontSize: 20, fontWeight: 700 },
    subtitle: { fontSize: 17, fontWeight: 600 },
    body: { fontSize: 15, lineHeight: 1.5 },
    caption: { fontSize: 12.5, lineHeight: 1.4 },
    label: { fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 },
  }
  return (
    <Tag
      className={className}
      style={{ color: tones[tone], ...variants[variant], ...rest.style }}
      {...rest}
    />
  )
}

/* --------------------------------- surface ------------------------------- */

export function Card({
  children,
  className,
  padded = true,
  glow,
  style,
  ...rest
}: {
  children: React.ReactNode
  className?: string
  padded?: boolean
  glow?: 'accent' | 'accent2' | null
  style?: React.CSSProperties
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'style'>) {
  return (
    <div
      className={cx('dh-card', className)}
      style={{
        background: 'var(--dh-surface)',
        border: '1px solid var(--dh-border)',
        borderRadius: tokens.radius.lg,
        padding: padded ? tokens.spacing[4] : 0,
        boxShadow: glow ? (glow === 'accent' ? tokens.shadow.glow : tokens.shadow.glow2) : tokens.shadow.card,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Row({
  children,
  between,
  align = 'center',
  className,
  style,
}: {
  children: React.ReactNode
  between?: boolean
  align?: 'center' | 'start' | 'end'
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : 'center',
        justifyContent: between ? 'space-between' : 'flex-start',
        gap: 12,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Spacer({ size = 12 }: { size?: number }) {
  return <div style={{ height: size }} aria-hidden />
}

/* --------------------------------- buttons ------------------------------- */

type BtnVariant = 'primary' | 'accent' | 'ghost' | 'danger' | 'outline'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  block,
  loading,
  disabled,
  onClick,
  className,
  style,
  type = 'button',
  ...rest
}: {
  children: React.ReactNode
  variant?: BtnVariant
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const bg: Record<BtnVariant, string> = {
    primary: 'linear-gradient(135deg, var(--dh-accent) 0%, var(--dh-accent-strong) 100%)',
    accent: 'linear-gradient(135deg, var(--dh-accent-2) 0%, var(--dh-accent-2-strong) 100%)',
    ghost: 'transparent',
    danger: 'var(--dh-danger)',
    outline: 'transparent',
  }
  const fg: Record<BtnVariant, string> = {
    primary: '#06231A',
    accent: '#FFFFFF',
    ghost: 'var(--dh-text)',
    danger: '#FFFFFF',
    outline: 'var(--dh-text)',
  }
  const pad = { sm: '7px 14px', md: '11px 18px', lg: '14px 22px' }
  const fontSize = { sm: 13.5, md: 15, lg: 16 }
  const isDisabled = disabled || loading
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: block ? '100%' : undefined,
        padding: pad[size],
        borderRadius: tokens.radius.md,
        background: bg[variant],
        color: fg[variant],
        border: variant === 'outline' ? `1px solid var(--dh-border-strong)` : 'none',
        fontSize: fontSize[size],
        fontWeight: 600,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.55 : 1,
        transition: 'opacity .15s ease, transform .1s ease',
        ...style,
      }}
      {...rest}
    >
      {loading && <Spinner size={16} color={fg[variant]} />}
      {children}
    </button>
  )
}

export function IconButton({
  children,
  onClick,
  label,
  style,
}: {
  children: React.ReactNode
  onClick?: () => void
  label?: string
  style?: React.CSSProperties
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: tokens.radius.md,
        background: 'var(--dh-surface-2)',
        border: '1px solid var(--dh-border)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--dh-text)',
        fontSize: 18,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

/* ------------------------------- states ---------------------------------- */

export function Spinner({ size = 20, color = 'var(--dh-accent)' }: { size?: number; color?: string }) {
  return (
    <span
      aria-label="yuklanmoqda"
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'dh-spin .7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}

export function PageLoader({ label = 'Yuklanmoqda…' }: { label?: string }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 48, gap: 12, color: 'var(--dh-text-secondary)' }}>
      <Spinner size={26} />
      <Text variant="body" tone="secondary">
        {label}
      </Text>
    </div>
  )
}

export function Skeleton({ w = '100%', h = 14, radius = 8, style }: { w?: number | string; h?: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: 'linear-gradient(90deg, var(--dh-surface-2) 25%, var(--dh-surface-3) 50%, var(--dh-surface-2) 75%)',
        backgroundSize: '200% 100%',
        animation: 'dh-shimmer 1.4s infinite',
        ...style,
      }}
    />
  )
}

export function CardSkeleton() {
  return (
    <Card>
      <Skeleton h={16} w="40%" />
      <Spacer size={12} />
      <Skeleton h={12} w="90%" />
      <Spacer size={6} />
      <Skeleton h={12} w="70%" />
    </Card>
  )
}

export function EmptyState({
  emoji = '📭',
  title,
  hint,
  action,
}: {
  emoji?: string
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div style={{ textAlign: 'center', padding: 32, color: 'var(--dh-text-secondary)' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>{emoji}</div>
      <Text variant="subtitle" tone="text">
        {title}
      </Text>
      {hint && (
        <Text variant="body" tone="secondary" style={{ display: 'block', marginTop: 6 }}>
          {hint}
        </Text>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Xatolik yuz berdi', onRetry, message }: { title?: string; onRetry?: () => void; message?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
      <Text variant="subtitle" tone="danger">
        {title}
      </Text>
      {message && (
        <Text variant="body" tone="secondary" style={{ display: 'block', marginTop: 6 }}>
          {message}
        </Text>
      )}
      {onRetry && (
        <div style={{ marginTop: 16 }}>
          <Button variant="outline" onClick={onRetry}>
            Qayta urinish
          </Button>
        </div>
      )}
    </div>
  )
}

/* --------------------------------- badges -------------------------------- */

export function Badge({
  children,
  tone = 'neutral',
  style,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
  style?: React.CSSProperties
}) {
  const tones: Record<string, { fg: string; bg: string }> = {
    neutral: { fg: 'var(--dh-text-secondary)', bg: 'var(--dh-surface-2)' },
    success: { fg: 'var(--dh-accent)', bg: 'var(--dh-success-bg, rgba(43,217,163,0.12))' },
    warning: { fg: 'var(--dh-warning)', bg: 'var(--dh-warning-bg, rgba(255,176,32,0.14))' },
    danger: { fg: 'var(--dh-danger)', bg: 'var(--dh-danger-bg, rgba(255,93,108,0.12))' },
    info: { fg: 'var(--dh-info)', bg: 'var(--dh-info-bg, rgba(56,189,248,0.12))' },
    accent: { fg: 'var(--dh-accent-2)', bg: 'var(--dh-accent2-bg, rgba(124,108,255,0.14))' },
  }
  const t = tones[tone]!
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 9px',
        borderRadius: tokens.radius.full,
        background: t.bg,
        color: t.fg,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/* -------------------------------- progress ------------------------------- */

export function Progress({ value, color = 'var(--dh-accent)', height = 8 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div style={{ height, borderRadius: tokens.radius.full, background: 'var(--dh-surface-3)', overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: tokens.radius.full, transition: 'width .4s ease' }} />
    </div>
  )
}

/* ------------------------------- money text ------------------------------ */

export function MoneyText({ value, sign = false, tone, size = 18, suffix = "so'm" }: { value: number; sign?: boolean; tone?: 'text' | 'success' | 'danger' | 'secondary'; size?: number; suffix?: string }) {
  const formatted = Math.round(value).toLocaleString('ru-RU')
  const color = tone === 'success' ? 'var(--dh-accent)' : tone === 'danger' ? 'var(--dh-danger)' : tone === 'secondary' ? 'var(--dh-text-secondary)' : 'var(--dh-text)'
  const signStr = sign ? (value > 0 ? '+ ' : value < 0 ? '− ' : '') : ''
  return (
    <span style={{ color, fontSize: size, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>
      {signStr}
      {formatted} <span style={{ fontSize: size * 0.55, fontWeight: 500, opacity: 0.7 }}>{suffix}</span>
    </span>
  )
}

export function Stat({
  label,
  value,
  delta,
  deltaTone,
}: {
  label: string
  value: React.ReactNode
  delta?: React.ReactNode
  deltaTone?: 'success' | 'danger'
}) {
  return (
    <Card padded={false} style={{ padding: 14 }}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, color: 'var(--dh-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {delta != null && (
        <div style={{ marginTop: 4, fontSize: 12, color: deltaTone === 'danger' ? 'var(--dh-danger)' : 'var(--dh-accent)', fontWeight: 600 }}>{delta}</div>
      )}
    </Card>
  )
}

/* --------------------------------- inputs -------------------------------- */

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label style={{ display: 'block' }}>
      <Text variant="label" tone="secondary" style={{ display: 'block', marginBottom: 6 }}>
        {label}
      </Text>
      {children}
      {hint && (
        <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 5 }}>
          {hint}
        </Text>
      )}
    </label>
  )
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: tokens.radius.md,
  background: 'var(--dh-surface-2)',
  border: '1px solid var(--dh-border)',
  color: 'var(--dh-text)',
  fontSize: 15,
  outline: 'none',
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        ...inputStyle,
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8'><path d='M1 1l5 5 5-5' stroke='%239AA4B8' stroke-width='2' fill='none' stroke-linecap='round'/></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
        paddingRight: 36,
        ...props.style,
      }}
    />
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, resize: 'vertical', minHeight: 88, ...props.style }} />
}

/* ------------------------------- screen bits ----------------------------- */

export function ScreenHeader({ title, back, right, onBack }: { title: string; back?: boolean; right?: React.ReactNode; onBack?: () => void }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 16px',
        background: 'rgba(11,15,26,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--dh-border)',
      }}
    >
      {back && <IconButton label="orqaga" onClick={onBack ?? (() => window.history.back())}>←</IconButton>}
      <Text variant="subtitle" tone="text" style={{ flex: 1 }}>
        {title}
      </Text>
      {right}
    </div>
  )
}

export function Screen({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: '16px 16px 96px', maxWidth: 480, margin: '0 auto', width: '100%', ...style }}>{children}</div>
  )
}

/** Loads the kit's base animation + variables into the document (idempotent). */
export function ensureKitStyles() {
  if (typeof document !== 'undefined' && !document.getElementById('dh-kit-css')) {
    const style = document.createElement('style')
    style.id = 'dh-kit-css'
    style.textContent = `
      @keyframes dh-spin { to { transform: rotate(360deg) } }
      @keyframes dh-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
    `
    document.head.appendChild(style)
  }
}
