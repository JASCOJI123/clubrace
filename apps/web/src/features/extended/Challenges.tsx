import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, EmptyState, Row, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { extendedApi } from '../../lib/api'

/** Challenges (spec §19) — join, participate. Leaderboard respects privacy opt-out. */
export function Challenges() {
  const navigate = useNavigate()
  const { data, isLoading, refetch } = useQuery({ queryKey: ['challenges'], queryFn: extendedApi.challenges.list })
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  const join = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }))
    await extendedApi.challenges.join(id)
    setBusy((b) => ({ ...b, [id]: false }))
    refetch()
  }

  return (
    <Screen>
      <ScreenHeader
        title="Challenges"
        back
        right={
          <Link to="/leaderboard" style={{ fontSize: 13, color: 'var(--dh-info)', textDecoration: 'none' }}>
            Reyting →
          </Link>
        }
      />
      {isLoading && (
        <Card>
          <Text variant="body" tone="secondary">
            Yuklanmoqda…
          </Text>
        </Card>
      )}
      {data && data.items.length === 0 && (
        <EmptyState emoji="🏆" title="Hozircha challenges yo‘q" hint="Ishlab chiquvchi tomonidan e’lon qilinadi" />
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {data?.items.map((c) => (
          <Card key={c.id} style={{ borderColor: c.joined ? 'rgba(124,108,255,0.45)' : 'var(--dh-border)' }}>
            <Row between align="start">
              <div style={{ flex: 1 }}>
                <Text variant="subtitle">🏆 {c.name}</Text>
                <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 2 }}>
                  {dateRange(c.startDate, c.endDate)} · {c.participantCount} ishtirokchi
                </Text>
                {c.reward && (
                  <Badge tone="accent" style={{ marginTop: 6 }}>
                    🎁 {c.reward}
                  </Badge>
                )}
                {c.description && (
                  <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 6 }}>
                    {c.description}
                  </Text>
                )}
              </div>
            </Row>
            {!c.joined ? (
              <div style={{ marginTop: 10 }}>
                <Button block size="sm" loading={busy[c.id]} onClick={() => void join(c.id)}>
                  Qo‘shilish
                </Button>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <Button block size="sm" variant="outline" onClick={() => navigate('/leaderboard')}>
                  Davom etish · natijalar
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </Screen>
  )
}

function dateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.toLocaleDateString('uz-UZ')} — ${e.toLocaleDateString('uz-UZ')}`
}