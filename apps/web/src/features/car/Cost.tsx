import { useQuery } from '@tanstack/react-query'
import { Card, EmptyState, ErrorState, Row, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { carApi } from '../../lib/api'

/** Car cost analytics (spec §9) — honest; per-km values `null` until odometer known. */
export function Cost() {
  const cars = useQuery({ queryKey: ['cars'], queryFn: carApi.list })
  const car = cars.data?.items.find((c) => c.isPrimary) ?? cars.data?.items[0]

  const cost = useQuery({
    queryKey: ['car-cost', car?.id],
    queryFn: () => carApi.cost(car!.id),
    enabled: Boolean(car),
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
    </Screen>
  )
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${Math.round(n).toLocaleString('ru-RU')} so‘m`
}