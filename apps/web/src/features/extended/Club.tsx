import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, EmptyState, ErrorState, Row, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { extendedApi } from '../../lib/api'
import { daysLeft, fullDate } from '../../lib/format'

/** Driver Club offers (spec §17). Claim → unique coupon, one per user. */
export function Club() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['club-offers'], queryFn: extendedApi.club.offers })
  const claims = useQuery({ queryKey: ['club-claims'], queryFn: extendedApi.club.myClaims })
  const [claimed, setClaimed] = useState<Record<string, { coupon: string; msg: string }>>({})

  const claim = async (id: string) => {
    try {
      const res = await extendedApi.club.claim(id)
      setClaimed((c) => ({ ...c, [id]: { coupon: res.couponCode, msg: res.message } }))
      claims.refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xatolik')
    }
  }

  if (isError) {
    return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
  }

  return (
    <Screen>
      <ScreenHeader title="Driver Club" back />
      {isLoading && (
        <Card>
          <Text variant="body" tone="secondary">
            Yuklanmoqda…
          </Text>
        </Card>
      )}
      {data && data.items.length === 0 && (
        <EmptyState emoji="💳" title="Hozircha takliflar yo‘q" hint="Yaqinda hamkorlar chegirmalari chiqadi" />
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {data?.items.map((o) => {
          const left = daysLeft(o.validUntil)
          const c = claimed[o.id]
          return (
            <Card key={o.id}>
              <Row between>
                <Text variant="subtitle">{o.title}</Text>
                {o.discountText && <Badge tone="success">{o.discountText}</Badge>}
              </Row>
              <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 4 }}>
                {o.partner.businessName}
              </Text>
              {o.description && (
                <Text variant="body" tone="secondary" style={{ display: 'block', marginTop: 6 }}>
                  {o.description}
                </Text>
              )}
              <Row between style={{ marginTop: 10 }}>
                <Text variant="caption" tone="muted">
                  {left !== null ? `${left} kun qoldi · ${fullDate(o.validUntil)}` : 'Muddat yo‘q'}
                </Text>
                {c ? (
                  <Card padded={false} style={{ padding: '8px 12px', background: 'var(--dh-accent2-bg)', borderColor: 'rgba(124,108,255,0.4)' }}>
                    <Text variant="caption" tone="text" style={{ fontWeight: 700, letterSpacing: 1 }}>
                      Kupon: {c.coupon}
                    </Text>
                  </Card>
                ) : (
                  <Button size="sm" onClick={() => void claim(o.id)}>
                    Olish
                  </Button>
                )}
              </Row>
            </Card>
          )
        })}
      </div>
    </Screen>
  )
}