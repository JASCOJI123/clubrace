import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, EmptyState, ErrorState, Row, Screen, ScreenHeader, Text, tokens } from '@driverhub/ui'
import { moneyApi, workApi } from '../../lib/api'
import { formatHours, money, shortDate, PLATFORM_LABEL, CATEGORY_LABEL } from '../../lib/format'

type Tab = 'income' | 'expense'

type MoneyItem = {
  id: string
  amount: number
  date: string
  platform?: string
  category?: string
  tripCount?: number | null
  notes?: string | null
  receiptUrl?: string | null
}

/**
 * Money journal (spec §6, §7). Income + expenses in one feed, newest first.
 * Honest states: skeleton / empty / error / success (spec RULE 10).
 */
export function Money() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('expense')
  const [workStarted, setWorkStarted] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery<{ items: MoneyItem[]; nextCursor: string | null }>({
    queryKey: ['money', tab],
    queryFn: () =>
      (tab === 'income'
        ? moneyApi.income().then((r) => ({ items: r.items as unknown as MoneyItem[], nextCursor: r.nextCursor }))
        : moneyApi.expenses().then((r) => ({ items: r.items as unknown as MoneyItem[], nextCursor: r.nextCursor }))) as Promise<{
        items: MoneyItem[]
        nextCursor: string | null
      }>,
  })
  const current = useQuery({ queryKey: ['ws-current'], queryFn: workApi.current })

  const items = data?.items ?? []

  return (
    <Screen>
      <ScreenHeader
        title="Pul"
        right={<Link to="/money/table" style={{ fontSize: 13, color: 'var(--dh-info)', textDecoration: 'none' }}>Oylik tahlil</Link>}
      />

      {/* work-session pill */}
      {current.data?.session ? (
        <Card style={{ borderColor: 'rgba(43,217,163,0.4)' }}>
          <Row between>
            <div>
              <Badge tone="success">● Smena davom etmoqda</Badge>
              <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 4 }}>
                {formatHours(current.data.session.durationMinutes)} o‘tdi
              </Text>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/money/table')}>
              Natija
            </Button>
          </Row>
        </Card>
      ) : (
        <Card>
          <Row between>
            <div>
              <Text variant="body">Ishni boshlamoqchimisiz?</Text>
              <Text variant="caption" tone="secondary" style={{ display: 'block' }}>
                Smenani kuzatish uchun boshlang
              </Text>
            </div>
            <Button
              size="sm"
              loading={workStarted}
              onClick={async () => {
                setWorkStarted(true)
                await workApi.start()
                setWorkStarted(false)
                void current.refetch()
              }}
            >
              ▶ Boshla
            </Button>
          </Row>
        </Card>
      )}

      {/* tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          margin: '16px 0 12px',
          background: 'var(--dh-surface)',
          padding: 4,
          borderRadius: tokens.radius.md,
          border: '1px solid var(--dh-border)',
        }}
      >
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: tokens.radius.sm,
              border: 'none',
              cursor: 'pointer',
              background: tab === t ? 'var(--dh-surface-3)' : 'transparent',
              color: tab === t ? 'var(--dh-text)' : 'var(--dh-text-secondary)',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {t === 'income' ? 'Daromad' : 'Xarajat'}
          </button>
        ))}
      </div>

      {isLoading && <Card><Text variant="body" tone="secondary">Yuklanmoqda…</Text></Card>}
      {isError && <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />}

      {items.length === 0 && !isLoading && !isError && (
        <EmptyState
          emoji={tab === 'income' ? '🪙' : '🧾'}
          title={tab === 'income' ? 'Hali daromad yo‘q' : 'Hali xarajat yo‘q'}
          hint={tab === 'income' ? 'Birinchi daromadni qo‘shing' : 'Birinchi xarajatni qo‘shing'}
          action={
            <Button variant="accent" onClick={() => navigate(tab === 'income' ? '/money/new-income' : '/money/new-expense')}>
              + Qo‘shish
            </Button>
          }
        />
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((it) => (
          <MoneyRow key={it.id} kind={tab} item={it} />
        ))}
      </div>

      {!isLoading && !isError && items.length > 0 && !data?.nextCursor && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <AddButton to="/money/new-income" label="＋ Daromad" color="var(--dh-accent)" />
          <AddButton to="/money/new-expense" label="− Xarajat" color="var(--dh-danger)" />
        </div>
      )}
    </Screen>
  )
}

function MoneyRow({ kind, item }: { kind: Tab; item: MoneyItem }) {
  const isIncome = kind === 'income'
  const cat = isIncome ? item.platform : item.category
  const label = (isIncome ? PLATFORM_LABEL[cat ?? ''] : CATEGORY_LABEL[cat ?? '']) ?? cat ?? '—'
  return (
    <Card padded={false} style={{ padding: '12px 14px' }}>
      <Row between>
        <div style={{ minWidth: 0 }}>
          <Row align="start" className="gap-1">
            <span style={{ fontSize: 12, color: isIncome ? 'var(--dh-accent)' : 'var(--dh-danger)', fontWeight: 700 }}>
              {isIncome ? '+' : '−'}
            </span>
            <div>
              <Text variant="subtitle" style={{ display: 'block' }}>
                {money(item.amount)}
              </Text>
              <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 2 }}>
                {label}
                {!isIncome && item.receiptUrl ? ' 🧾' : ''}
                {isIncome && item.tripCount != null ? ` · ${item.tripCount} ta` : ''}
              </Text>
            </div>
          </Row>
        </div>
        <Text variant="caption" tone="muted">
          {shortDate(item.date)}
        </Text>
      </Row>
    </Card>
  )
}

function AddButton({ to, label, color }: { to: string; label: string; color: string }) {
  return (
    <Link
      to={to}
      style={{
        flex: 1,
        textAlign: 'center',
        textDecoration: 'none',
        padding: '12px 0',
        borderRadius: tokens.radius.md,
        background: 'var(--dh-surface-2)',
        border: `1px solid ${color}55`,
        color,
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      {label}
    </Link>
  )
}