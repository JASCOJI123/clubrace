import React from 'react'
import { Badge, Card, Skeleton, Text } from '@driverhub/ui'
import { statusTone, STATUS_LABEL } from './format'

/** Shared building blocks for the admin + partner panel. */

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      <div>
        <Text variant="title" style={{ fontSize: 24 }}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="body" tone="secondary" style={{ display: 'block', marginTop: 4 }}>
            {subtitle}
          </Text>
        )}
      </div>
      {right && <div style={{ display: 'flex', gap: 8 }}>{right}</div>}
    </div>
  )
}

export function StatCard({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <Card padded={false} style={{ padding: '16px 18px', borderColor: accent ? 'rgba(124,108,255,0.35)' : undefined }}>
      <Text variant="caption" tone="secondary" style={{ display: 'block' }}>
        {label}
      </Text>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: accent ? 'var(--dh-accent-2)' : 'var(--dh-text)', letterSpacing: -0.4 }}>
        {value}
      </div>
      {hint && (
        <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 2 }}>
          {hint}
        </Text>
      )}
    </Card>
  )
}

export function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <Card style={{ marginTop: 16, ...style }}>{children}</Card>
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 10, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
      {children}
    </Text>
  )
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} padded={false} style={{ padding: '14px 16px' }}>
          <Skeleton w="70%" h={14} />
          <Skeleton w="35%" h={11} style={{ marginTop: 8 }} />
        </Card>
      ))}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{STATUS_LABEL[status] ?? status}</Badge>
}

export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--dh-border)', borderRadius: 12, background: 'var(--dh-surface)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  color: 'var(--dh-text-muted)',
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  borderBottom: '1px solid var(--dh-border)',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--dh-border)', verticalAlign: 'top', ...style }}>
      {children}
    </td>
  )
}

export function ActionsRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
  )
}