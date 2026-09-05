import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, EmptyState, ErrorState, Row, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { extendedApi } from '../../lib/api'
import { money } from '../../lib/format'

/** Marketplace (spec §24) — browse + moderate-listed items. Real CRUD, PENDING gate. */
export function Marketplace() {
  const listings = useQuery({ queryKey: ['marketplace'], queryFn: extendedApi.marketplace.listings })
  const mine = useQuery({ queryKey: ['my-listings'], queryFn: extendedApi.marketplace.myListings })

  if (listings.isError) {
    return <ErrorState message={listings.error instanceof Error ? listings.error.message : undefined} onRetry={() => void listings.refetch()} />
  }

  const items = listings.data?.items ?? []

  return (
    <Screen>
      <ScreenHeader
        title="Marketplace"
        right={
          <Link to="/marketplace/new" style={{ fontSize: 13, color: 'var(--dh-accent)', textDecoration: 'none', fontWeight: 700 }}>
            + Elon
          </Link>
        }
      />
      {listings.isLoading && (
        <Card>
          <Text variant="body" tone="secondary">
            Yuklanmoqda…
          </Text>
        </Card>
      )}
      {items.length === 0 && !listings.isLoading && (
        <EmptyState
          emoji="🛒"
          title="Elonlar yo‘q"
          hint="Haydovchilar o‘rtasida mashina/butler plyonka, shina, xavfsizlik kamera sotiladi"
          action={
            <Link to="/marketplace/new" style={{ textDecoration: 'none' }}>
              <Button variant="accent">+ Elon qo‘shish</Button>
            </Link>
          }
        />
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((l) => (
          <Card key={l.id}>
            {l.images && l.images.length > 0 && (
              <img src={l.images[0]!.url} alt={l.title} style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
            )}
            <Row between align="start">
              <div style={{ flex: 1 }}>
                <Text variant="subtitle">{l.title}</Text>
                <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 2 }}>
                  {l.category?.name ?? ''}
                  {l.location ? ` · ${l.location}` : ''}
                </Text>
              </div>
              <Badge tone="accent">{money(l.price)}</Badge>
            </Row>
            {l.description && (
              <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 6 }}>
                {l.description.slice(0, 140)}
                {l.description.length > 140 ? '…' : ''}
              </Text>
            )}
            <Row between style={{ marginTop: 8 }}>
              <Text variant="caption" tone="muted">
                {l.user?.name ?? 'Haydovchi'} · {CONDITION_LABEL[l.condition] ?? l.condition}
              </Text>
              <Badge tone={l.status === 'APPROVED' ? 'success' : l.status === 'PENDING' ? 'warning' : 'neutral'}>
                {STATUS_LABEL[l.status] ?? l.status}
              </Badge>
            </Row>
          </Card>
        ))}
      </div>

      {mine.data && mine.data.items.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 6 }}>
            Mening elonlarim
          </Text>
          {mine.data.items.map((l) => (
            <Card key={l.id} padded={false} style={{ padding: '12px 14px' }}>
              <Row between>
                <Text variant="body">{l.title}</Text>
                <Badge tone={l.status === 'APPROVED' ? 'success' : l.status === 'PENDING' ? 'warning' : 'danger'}>
                  {l.status === 'PENDING' ? 'Moderatsiyada' : l.status}
                </Badge>
              </Row>
            </Card>
          ))}
        </div>
      )}
    </Screen>
  )
}

export const CONDITION_LABEL: Record<string, string> = {
  NEW: 'Yangi',
  LIKE_NEW: 'Yangi qiyofada',
  USED: 'Ishlatilgan',
  SPARE_PARTS: 'Ehtiyot qismlar',
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  APPROVED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
  REMOVED: 'Olib tashlangan',
  SOLD: 'Sotilgan',
}