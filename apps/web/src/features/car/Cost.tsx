import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Button, Card, EmptyState, ErrorState, Field, Input, Row, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { carApi } from '../../lib/api'

/** Car cost analytics (spec §9) — honest; per-km values `null` until odometer known. */
export function Cost() {
  const queryClient = useQueryClient()
  const cars = useQuery({ queryKey: ['cars'], queryFn: carApi.list })
  const car = cars.data?.items.find((c) => c.isPrimary) ?? cars.data?.items[0]

  const cost = useQuery({
    queryKey: ['car-cost', car?.id],
    queryFn: () => carApi.cost(car!.id),
    enabled: Boolean(car),
  })

  const mileage = useQuery({
    queryKey: ['car-mileage', car?.id],
    queryFn: () => carApi.mileageLogs(car!.id),
    enabled: Boolean(car),
  })

  const [addOpen, setAddOpen] = useState(false)
  const [km, setKm] = useState('')
  const [note, setNote] = useState('')

  const addLog = useMutation({
    mutationFn: () => carApi.addMileageLog(car!.id, { mileageKms: Number(km), ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['car-mileage', car?.id] })
      void queryClient.invalidateQueries({ queryKey: ['car-cost', car?.id] })
      void queryClient.invalidateQueries({ queryKey: ['cars'] })
      setKm('')
      setNote('')
      setAddOpen(false)
    },
  })

  const removeLog = useMutation({
    mutationFn: (id: string) => carApi.deleteMileageLog(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['car-mileage', car?.id] })
      void queryClient.invalidateQueries({ queryKey: ['car-cost', car?.id] })
      void queryClient.invalidateQueries({ queryKey: ['cars'] })
    },
  })

  if (cars.isError) {
    return <ErrorState message={cars.error instanceof Error ? cars.error.message : undefined} onRetry={() => void cars.refetch()} />
  }
  if (!car) {
    return (
      <Screen>
        <ScreenHeader title="Mashina xarajati" back />
        <EmptyState emoji="🚗" title="Mashina yo‘q" hint="Avval avtomobil qo‘shing" />
      </Screen>
    )
  }

  const s = cost.data
  const rows: Array<[string, string]> = [
    ['Ta’mirlash va servis (180 kun)', s ? fmt(s.totalMaintenanceCost) : '…'],
    ['Oylik servis xarajati', s ? fmt(s.maintenanceCostPerMonth) : '…'],
    ['Servis, 1 km uchun', s ? (s.maintenanceCostPerKm === null ? '— km noma’lum' : fmt(s.maintenanceCostPerKm)) : '…'],
    ['Yoqilg‘i, 1 km uchun', s ? (s.fuelCostPerKm === null ? '— km noma’lum' : fmt(s.fuelCostPerKm)) : '…'],
    ['Umumiy (servis+yoqilg‘i), 1 km', s ? (s.totalVehicleCostPerKm === null ? '— km noma’lum' : fmt(s.totalVehicleCostPerKm)) : '…'],
  ]

  const chartData = (mileage.data?.items ?? []).map((m) => ({
    label: new Date(m.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
    km: m.mileageKms,
  }))

  return (
    <Screen>
      <ScreenHeader title="Mashina xarajati" back />
      <Card>
        <Text variant="title">
          {car.brand} {car.model}
        </Text>
        <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 2 }}>
          {car.mileageKms > 0 ? `${car.mileageKms.toLocaleString('ru-RU')} km` : 'Kilometraj kiritilmagan'}
        </Text>
      </Card>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {rows.map(([label, value]) => (
          <Card key={label} padded={false} style={{ padding: '12px 14px' }}>
            <Row between>
              <Text variant="body" tone="secondary">
                {label}
              </Text>
              <Text variant="subtitle">{value}</Text>
            </Row>
          </Card>
        ))}
      </div>
      {car.mileageKms === 0 && (
        <Card style={{ marginTop: 12, background: 'var(--dh-warning-bg)', borderColor: 'rgba(255,176,32,0.35)' }}>
          <Text variant="caption" tone="warning" style={{ display: 'block', lineHeight: 1.5 }}>
            💡 1 km narxlari uchun mashina profiliga kilometraj qo‘shing. Hozircha faqat umumiy xarajat
            ko‘rsatiladi — km ma’lumotlari uydirmaymiz.
          </Text>
        </Card>
      )}

      {/* ---- mileage history ---- */}
      <Card style={{ marginTop: 12 }}>
        <Row between>
          <Text variant="label" tone="muted">
            Kilometraj tarixi
          </Text>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(!addOpen)}>
            {addOpen ? '✕ Yopish' : '+ Qo‘shish'}
          </Button>
        </Row>

        {addOpen && (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <Field label="Hozirgi kilometraj">
              <Input type="text" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder="52400" />
            </Field>
            <Field label="Izoh (ixtiyoriy)">
              <Input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: moy almashtirishdan keyin" />
            </Field>
            {addLog.isError && (
              <Text variant="caption" tone="danger">
                {addLog.error instanceof Error ? addLog.error.message : 'Xatolik'}
              </Text>
            )}
            <Button size="sm" loading={addLog.isPending} disabled={!km || Number(km) <= 0} onClick={() => void addLog.mutateAsync()}>
              Saqlash
            </Button>
          </div>
        )}

        {chartData.length > 1 && (
          <div style={{ height: 140, marginTop: 14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill: '#6B7690', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis tick={{ fill: '#6B7690', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={40} />
                <Tooltip
                  contentStyle={{ background: '#1B2438', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12.5 }}
                  labelStyle={{ color: '#F4F6FB' }}
                  formatter={(value: number) => [`${value.toLocaleString('ru-RU')} km`, 'Kilometraj']}
                />
                <Line type="monotone" dataKey="km" stroke="#7C6CFF" strokeWidth={2.5} dot={{ r: 3, fill: '#7C6CFF', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {mileage.data && mileage.data.items.length === 0 && !addOpen && (
          <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 10 }}>
            Hali yozuv yo‘q — kilometrajni vaqti-vaqti bilan qo‘shib boring, o‘sish grafigini shu yerda ko‘rasiz.
          </Text>
        )}

        {mileage.data && mileage.data.items.length > 0 && (
          <div style={{ display: 'grid', gap: 6, marginTop: 14 }}>
            {[...mileage.data.items].reverse().slice(0, 10).map((m) => (
              <Row key={m.id} between style={{ padding: '6px 0', borderBottom: '1px solid var(--dh-border)' }}>
                <div>
                  <Text variant="body">{m.mileageKms.toLocaleString('ru-RU')} km</Text>
                  <Text variant="caption" tone="muted" style={{ display: 'block' }}>
                    {new Date(m.date).toLocaleDateString('ru-RU')}
                    {m.note ? ` · ${m.note}` : ''}
                  </Text>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void removeLog.mutateAsync(m.id)}>
                  🗑
                </Button>
              </Row>
            ))}
          </div>
        )}
      </Card>
    </Screen>
  )
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${Math.round(n).toLocaleString('ru-RU')} so‘m`
}