import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, Row, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { extendedApi } from '../../lib/api'

/** PRO subscription (spec §13). Payment is created server-side and verified
 *  by an admin (local provider) or a webhook — never trusted from the client. */
export function Pro() {
  const { data, refetch } = useQuery({ queryKey: ['sub-current'], queryFn: extendedApi.subscriptions.current })
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const subscribe = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await extendedApi.subscriptions.subscribe()
      setResult(res.note)
      void refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik')
    } finally {
      setBusy(false)
    }
  }

  const active = data?.subscription

  return (
    <Screen>
      <ScreenHeader title="PRO" back />
      {active ? (
        <Card glow="accent2">
          <Badge tone="accent">⭐ PRO faol</Badge>
          <Text variant="body" tone="secondary" style={{ display: 'block', marginTop: 8 }}>
            Muddat: {new Date(active.expiresAt).toLocaleDateString('uz-UZ')}
          </Text>
        </Card>
      ) : (
        <>
          <Card glow="accent2">
            <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
              <div style={{ fontSize: 40 }}>⭐</div>
              <Text variant="hero" tone="text" style={{ display: 'block', marginTop: 6 }}>
                PRO
              </Text>
              <Text variant="body" tone="secondary" style={{ display: 'block', marginTop: 4 }}>
                Cheksiz AI Coach · batafsil tahlil · reklama yo‘q
              </Text>
            </div>
          </Card>
          <Card style={{ marginTop: 12 }}>
            {FEATURES.map((f) => (
              <Row key={f} className="py-1" style={{ padding: '8px 0' }}>
                <span style={{ color: 'var(--dh-accent)' }}>✓</span>
                <Text variant="body" tone="text">
                  {f}
                </Text>
              </Row>
            ))}
          </Card>
          <Card style={{ marginTop: 12 }}>
            <Text variant="caption" tone="muted" style={{ display: 'block', lineHeight: 1.6 }}>
              Narx admin panelidagi PRO sozlamalarida o‘rnatiladi va to‘lov yaratilganda serverdan qaytariladi.
              To‘lov serverda yaratiladi va admin/webhook orqali tasdiqlanadi — mijoz tomoni hech qachon
              “PRO” deb hisoblanmaydi.
            </Text>
            {data?.subscription ? null : (
              <div style={{ marginTop: 14 }}>
                <Button block variant="accent" loading={busy} onClick={() => void subscribe()}>
                  💳 To‘lovni boshlash
                </Button>
              </div>
            )}
            {result && (
              <Text variant="caption" tone="success" style={{ display: 'block', marginTop: 10 }}>
                {result}
              </Text>
            )}
            {error && (
              <Text variant="caption" tone="danger" style={{ display: 'block', marginTop: 10 }}>
                {error}
              </Text>
            )}
          </Card>
        </>
      )}
    </Screen>
  )
}

const FEATURES = [
  'Cheksiz AI Coach savollari (30/oy bepul)',
  'Haftalik va oylik hisobotlar',
  'Deep tahlil: soat, km, kategoriya',
  'Challenge va Leaderboard imtiyozlari',
  'Klub chegirmalari to‘liq',
]