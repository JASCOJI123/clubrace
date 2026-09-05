import { useQuery } from '@tanstack/react-query'
import { Card, EmptyState, ErrorState, Row, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { extendedApi } from '../../lib/api'

/**
 * Challenge leaderboard (spec §18). Users who opted out of the leaderboard are
 * never shown — the server filters them (privacy is a hard rule, §69 R-listed).
 */
export function Leaderboard() {
  const challenges = useQuery({ queryKey: ['challenges'], queryFn: extendedApi.challenges.list })
  const active = challenges.data?.items.find((c) => c.joined)

  const board = useQuery({
    queryKey: ['leaderboard', active?.id],
    queryFn: () => extendedApi.challenges.leaderboard(active!.id),
    enabled: Boolean(active),
  })

  if (challenges.isError) {
    return <ErrorState message={challenges.error instanceof Error ? challenges.error.message : undefined} onRetry={() => void challenges.refetch()} />
  }

  if (!active) {
    return (
      <Screen>
        <ScreenHeader title="Leaderboard" back />
        <EmptyState emoji="🏅" title="Challenge qo‘shilmagan" hint="Avval challenge-ga qo‘shiling, reyting shunda ko‘rinadi" />
      </Screen>
    )
  }

  const rows = board.data?.items ?? []

  return (
    <Screen>
      <ScreenHeader title={`🏆 ${active.name}`} back />
      <Card>
        <Text variant="body" tone="text">
          {active.name}
        </Text>
        <Text variant="caption" tone="muted" style={{ display: 'block' }}>
          Davom etmoqda · {active.participantCount} ishtirokchi
        </Text>
      </Card>
      {rows.length === 0 ? (
        <EmptyState emoji="📄" title="Reyting bo‘sh" hint="Progress paydo bo‘lgach, bu yerda ko‘rinadi" />
      ) : (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {rows.map((r, i) => (
            <Card key={r.userId} padded={false} style={{ padding: '12px 14px' }}>
              <Row between>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>{medal(i)}</span>
                  <Text variant="body">{r.name ?? 'Haydovchi'}</Text>
                </div>
                <Text variant="subtitle">{r.progress != null ? `${Math.round(r.progress)}%` : '—'}</Text>
              </Row>
            </Card>
          ))}
        </div>
      )}
      <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 14, textAlign: 'center' }}>
        Maxfiylik tanlagan haydovchilar reytingdan avtomatik chiqarib tashlanadi.
      </Text>
    </Screen>
  )
}

function medal(i: number): string {
  if (i === 0) return '🥇'
  if (i === 1) return '🥈'
  if (i === 2) return '🥉'
  return `${i + 1}.`
}