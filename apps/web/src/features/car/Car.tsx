import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, EmptyState, ErrorState, Row, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { carApi } from '../../lib/api'
import { daysLeft, fullDate, money, SERVICE_LABEL } from '../../lib/format'

/** Car profile + upcoming/overdue maintenance (spec §9, §15). */
export function Car() {
  const cars = useQuery({ queryKey: ['cars'], queryFn: carApi.list })
  const due = useQuery({ queryKey: ['maintenance-due'], queryFn: carApi.maintenanceDue })
  const maintenance = useQuery({ queryKey: ['maintenance'], queryFn: carApi.maintenance })

  if (cars.isError) {
    return <ErrorState message={cars.error instanceof Error ? cars.error.message : undefined} onRetry={() => void cars.refetch()} />
  }

  const items = cars.data?.items ?? []
  const dueItems = due.data?.items ?? []
  const history = maintenance.data?.items ?? []

  return (
    <Screen>
      <ScreenHeader
        title="Mashina"
        right={<Link to="/car/cost" style={{ fontSize: 13, color: 'var(--dh-info)', textDecoration: 'none' }}>Xarajat</Link>}
      />

      {/* primary car */}
      {items.length === 0 ? (
        <EmptyState
          emoji="🚗"
          title="Mashina qo‘shilmagan"
          hint="Servis va xarajatlarni kuzatish uchun avtomobilingizni qo‘shing"
          action={
            <Link to="/car/new" style={{ textDecoration: 'none' }}>
              <Button>+ Mashina qo‘shish</Button>
            </Link>
          }
        />
      ) : (
        items.map((car) => (
          <Card key={car.id} style={{ marginTop: 8 }}>
            <Row between>
              <div>
                <Row>
                  <Text variant="title">{car.brand} {car.model}</Text>
                  {car.isPrimary && <Badge tone="success">Asosiy</Badge>}
                </Row>
                <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 4 }}>
                  {car.year ? `${car.year} · ` : ''}
                  {car.plate ? `№ ${car.plate} · ` : ''}
                  {FUEL[car.fuelType] ?? car.fuelType}
                </Text>
                <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 2 }}>
                  {car.mileageKms > 0 ? `${car.mileageKms.toLocaleString('ru-RU')} km` : 'Kilometraj — noma’lum'}
                </Text>
              </div>
              <Link to="/car/cost" style={{ color: 'var(--dh-info)', fontSize: 13, textDecoration: 'none' }}>
                Detal →
              </Link>
            </Row>
          </Card>
        ))
      )}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Link to="/car/new" style={{ flex: 1, textDecoration: 'none' }}>
            <Button block variant="outline" size="sm">
              + Yana mashina
            </Button>
          </Link>
          <Link to="/car/maintenance/new" style={{ flex: 1, textDecoration: 'none' }}>
            <Button block variant="accent" size="sm">
              + Servis yozuvi
            </Button>
          </Link>
        </div>
      )}

      {/* due maintenance */}
      {dueItems.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 6 }}>
            Rejalashtirilgan servis
          </Text>
          {dueItems.map((m) => {
            const left = daysLeft(m.nextDueDate)
            const overdue = left !== null && left < 0
            const soon = left !== null && left >= 0 && left <= 30
            return (
              <Card key={m.id} style={{ marginTop: 6, borderColor: overdue ? 'rgba(255,93,108,0.4)' : soon ? 'rgba(255,176,32,0.35)' : 'var(--dh-border)' }}>
                <Row between>
                  <Text variant="body">
                    {SERVICE_LABEL[m.serviceType] ?? m.serviceType}
                  </Text>
                  <Badge tone={overdue ? 'danger' : soon ? 'warning' : 'success'}>
                    {left === null ? 'Muddati yo‘q' : overdue ? `${Math.abs(left)} kun o‘tgan` : `${left} kun qoldi`}
                  </Badge>
                </Row>
                {m.nextDueDate && (
                  <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 4 }}>
                    {fullDate(m.nextDueDate)}
                  </Text>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* maintenance history */}
      {history.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 6 }}>
            Servis tarixi
          </Text>
          {history.slice(0, 6).map((m) => (
            <Card key={m.id} padded={false} style={{ padding: '11px 14px', marginTop: 6 }}>
              <Row between>
                <div>
                  <Text variant="body">{SERVICE_LABEL[m.serviceType] ?? m.serviceType}</Text>
                  <Text variant="caption" tone="muted" style={{ display: 'block' }}>
                    {fullDate(m.date)}
                  </Text>
                </div>
                <Text variant="subtitle">{money(m.cost)}</Text>
              </Row>
            </Card>
          ))}
        </div>
      )}
    </Screen>
  )
}

const FUEL: Record<string, string> = {
  PETROL: 'Benzin',
  DIESEL: 'Dizel',
  GAS: 'Metan',
  ELECTRIC: 'Elektr',
  HYBRID: 'Gibrid',
  OTHER: 'Boshqa',
}