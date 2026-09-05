import { useQuery } from '@tanstack/react-query'
import { Card, ErrorState, Row, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { moneyApi } from '../../lib/api'

/** Monthly average profitability (spec §7) — server-computed from real records. */
export function MoneyTable() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['money-table'],
    queryFn: moneyApi.moneyTable,
  })

  if (isError) return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />

  return (
    <Screen>
      <ScreenHeader title="O‘rtacha (30 kun)" back />
      {isLoading && <Card><Text variant="body" tone="secondary">Yuklanmoqda…</Text></Card>}
      {data && <Table rows={data} />}
    </Screen>
  )
}

interface MoneyTableRow {
  hourlyNet: string | null
  avgIncomePerDay: string
  avgExpensePerDay: string
  dailyNet: string
  tripsPerDay: number | null
  avgTripIncome: string | null
  fuelShare: string | null
}

function Table({ rows }: { rows: MoneyTableRow }) {
  const entries: Array<[string, string | null, string | null]> = [
    ['Soatdagi sof foyda', rows.hourlyNet, '🚀'],
    ['Kunlik o‘rtacha daromad', rows.avgIncomePerDay, '💵'],
    ['Kunlik o‘rtacha xarajat', rows.avgExpensePerDay, '🧾'],
    ['Kunlik sof foyda', rows.dailyNet, '📈'],
    ['Kuniga haydovlar', rows.tripsPerDay != null ? `${Math.round(rows.tripsPerDay * 10) / 10} ta` : null, '🔁'],
    ['Bir haydovdan daromad', rows.avgTripIncome, '🎫'],
    ['Yoqilg‘i ulushi (xarajatda)', rows.fuelShare, '⛽'],
  ]
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {entries.map(([label, value, emoji]) => (
        <Card key={label} padded={false} style={{ padding: '12px 14px' }}>
          <Row between>
            <span style={{ fontSize: 15, color: 'var(--dh-text)' }}>
              {emoji} {label}
            </span>
            <Text variant="subtitle" tone={value === null ? 'muted' : 'text'}>
              {value ?? '—'}
            </Text>
          </Row>
        </Card>
      ))}
    </div>
  )
}