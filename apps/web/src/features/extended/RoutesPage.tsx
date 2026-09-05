import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, EmptyState, Field, Input, Row, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { extendedApi } from '../../lib/api'

/**
 * Route marketplace (spec §25 — legal note: real intercity passenger carriage
 * requires licensing; this is a matching board, not a transport operator).
 */
export function RoutesPage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const { data, isFetching } = useQuery({
    queryKey: ['routes', search],
    queryFn: () => extendedApi.routes.search(search),
    enabled: search.length > 0,
  })

  const trigger = () => {
    setSearch(q.trim())
  }

  const [form, setForm] = useState({ fromCity: '', toCity: '', date: '', seats: '3', pricePerSeat: '' })
  const [publishing, setPublishing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const publish = async () => {
    setPublishing(true)
    try {
      const route = await extendedApi.routes.create({
        fromCity: form.fromCity.trim(),
        toCity: form.toCity.trim(),
        date: new Date(form.date).toISOString(),
        seats: Number(form.seats),
        pricePerSeat: Number(form.pricePerSeat),
      })
      setMsg(`Yo‘nalish e’lon qilindi (${'#'}${route.route.id.slice(0, 6)}). Yo‘lovchilar ariza beradi.`)
    } finally {
      setPublishing(false)
    }
  }

  const items = data?.items ?? []

  return (
    <Screen>
      <ScreenHeader title="Yo‘nalishlar" back />
      <Card>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish: shahar…" />
          </div>
          <Button size="sm" onClick={trigger}>
            Qidirish
          </Button>
        </div>
        {msg && (
          <Text variant="caption" tone="success" style={{ display: 'block', marginTop: 8 }}>
            {msg}
          </Text>
        )}
      </Card>

      {isFetching && !items.length && (
        <Card>
          <Text variant="body" tone="secondary">
            Qidirilmoqda…
          </Text>
        </Card>
      )}

      {!isFetching && !items.length && search.length > 0 && (
        <EmptyState emoji="🛣" title="Yo‘nalish topilmadi" hint="Shaharlar bo‘yicha qidiring yoki o‘zingiz e’lon qiling" />
      )}

      {!search && (
        <EmptyState emoji="🛣" title="Yo‘nalishlar bozori" hint="Qidiruv orqali yo‘nalish toping yoki pastda e’lon qiling" />
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {items.map((r) => (
          <Card key={r.id}>
            <Row between>
              <Text variant="subtitle">
                {r.fromCity} → {r.toCity}
              </Text>
              <Badge tone="info">{new Date(r.date).toLocaleDateString('uz-UZ')}</Badge>
            </Row>
            <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 4 }}>
              {r.departureTime ?? 'Vaqt — belgilanmagan'} · {r.seats} joy · {r._isOwner ? 'Sizning e’lon' : r.user?.name ?? 'Haydovchi'}
            </Text>
            {!r._isOwner && (
              <div style={{ marginTop: 10 }}>
                <Button size="sm" block variant="accent" onClick={() => void request(r.id)}>
                  Ariza berish · {formatPrice(r.pricePerSeat)}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* publish */}
      <div style={{ marginTop: 18 }}>
        <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 6 }}>
          YO‘NALISH E’LON QILISH
        </Text>
        <Card>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Field label="Qayerdan">
                  <Input value={form.fromCity} onChange={(e) => setForm({ ...form, fromCity: e.target.value })} placeholder="Toshkent" />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Qayerga">
                  <Input value={form.toCity} onChange={(e) => setForm({ ...form, toCity: e.target.value })} placeholder="Samarqand" />
                </Field>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Field label="Sana">
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Joylar">
                  <Input type="text" inputMode="numeric" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
                </Field>
              </div>
            </div>
            <Field label="O‘rindiq narxi (so‘m)">
              <Input type="text" inputMode="numeric" value={form.pricePerSeat} onChange={(e) => setForm({ ...form, pricePerSeat: e.target.value })} placeholder="150000" />
            </Field>
            <Button
              block
              loading={publishing}
              disabled={!form.fromCity.trim() || !form.toCity.trim() || !form.date || Number(form.pricePerSeat) < 1000}
              onClick={() => void publish()}
            >
              E’lon qilish
            </Button>
            <Text variant="caption" tone="muted" style={{ display: 'block', lineHeight: 1.5 }}>
              ⚖️ Bu faqat yo‘lovchi-haydovchi <b>matching</b>. Aksariyat mamlakatlarda muntazam shaxslararo tashish
              litsenziya talab qiladi — mamlakat qonunlarini tekshiring.
            </Text>
          </div>
        </Card>
      </div>
    </Screen>
  )
}

function request(id: string) {
  return extendedApi.routes.request(id).then(() => alert('Ariza yuborildi 👍'))
}

function formatPrice(price: number): string {
  return `${Math.round(price).toLocaleString('ru-RU')} so‘m`
}