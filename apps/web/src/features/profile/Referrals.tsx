import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, EmptyState, Row, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { extendedApi } from '../../lib/api'

/** Referral program (spec §20). Share link + honest reward status. */
export function Referrals() {
  const { data, isLoading } = useQuery({ queryKey: ['referrals'], queryFn: extendedApi.referrals.info })
  const [copied, setCopied] = useState(false)

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Referal dasturi" back />
        <Card>
          <Text variant="body" tone="secondary">
            Yuklanmoqda…
          </Text>
        </Card>
      </Screen>
    )
  }
  if (!data) return null

  const botLink = data.myCode ? `https://t.me/?start=${data.myCode}` : null

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Telegram WebView clipboard fallback
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Screen>
      <ScreenHeader title="Referal dasturi" back />
      <Card glow="accent2">
        <Text variant="subtitle">Taklif qiling va PRO oling</Text>
        <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 6 }}>
          Do‘stingiz bot orqali ilovaaga ulanib, onbordingni to‘liq o‘tsa — siz bonus olasiz.
        </Text>
        {data.myCode && (
          <div style={{ marginTop: 14 }}>
            <Text variant="label" tone="muted">
              SIZNING KOD
            </Text>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <Card padded={false} style={{ padding: '10px 14px', flex: 1 }}>
                <Text variant="subtitle" style={{ letterSpacing: 2, color: 'var(--dh-accent)' }}>
                  {data.myCode}
                </Text>
              </Card>
              <Button size="sm" onClick={() => void copy(botLink ?? data.myCode!)}>
                {copied ? 'Nusxalandi ✓' : 'Ulashish'}
              </Button>
            </div>
          </div>
        )}
        {data.referredBy && (
          <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 12 }}>
            Sizni taklif qilgan: {data.referredBy}
          </Text>
        )}
        <Row between style={{ marginTop: 16 }}>
          <Text variant="caption" tone="secondary">
            Jami: {data.stats.total}
          </Text>
          <Text variant="caption" tone="secondary">
            Faol: {data.stats.active}
          </Text>
          <Badge tone="success">Mukofotlangan: {data.stats.rewarded}</Badge>
        </Row>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState emoji="🤝" title="Hali takliflar yo‘q" hint="Kodingizni do‘stlarga yuboring" />
      ) : (
        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 2 }}>
            TAKLIFLAR
          </Text>
          {data.items.map((r) => (
            <Card key={r.id} padded={false} style={{ padding: '12px 14px' }}>
              <Row between>
                <Text variant="body">{r.inviteeName ?? 'Ismsiz foydalanuvchi'}</Text>
                <Badge tone={r.status === 'REWARDED' ? 'success' : r.inviteeOnboarded ? 'info' : 'warning'}>
                  {r.status === 'REWARDED' ? 'Mukofot berildi' : r.inviteeOnboarded ? 'Provеrka' : 'Kutilmoqda'}
                </Badge>
              </Row>
            </Card>
          ))}
        </div>
      )}
    </Screen>
  )
}