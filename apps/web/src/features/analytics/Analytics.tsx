import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts'
import { Card, EmptyState, ErrorState, Row, Screen, ScreenHeader, Text, tokens } from '@driverhub/ui'
import { meApi } from '../../lib/api'
import { shortDate } from '../../lib/format'

/**
 * Analytics (spec §12). Real series from buildDailySeries/buildWeeklySeries —
 * server-computed, honest. Insights are only emitted when there is enough data.
 */
export function Analytics() {
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['analytics', range],
    queryFn: () => meApi.analytics(range),
  })

  const dailyData = (data?.daily ?? [])
    .map((d) => ({ ...d, label: shortDate(d.date) }))
    .filter((d) => d.income > 0 || d.expenses > 0 || d.trips > 0)
  const weeklyData = (data?.weekly ?? []).map((w) => ({ ...w, label: w.label }))

  return (
    <Screen>
      <ScreenHeader
        title="Tahlil"
        right={
          <Link to="/money/table" style={{ fontSize: 13, color: 'var(--dh-info)', textDecoration: 'none' }}>
            Soatlik
          </Link>
        }
      />
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {([7, 30, 90] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: tokens.radius.sm,
              border: 'none',
              cursor: 'pointer',
              background: range === r ? 'var(--dh-surface-3)' : 'var(--dh-surface)',
              color: range === r ? 'var(--dh-text)' : 'var(--dh-text-secondary)',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {r} kun
          </button>
        ))}
      </div>

      {isError && <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />}
      {!isError && isLoading && (
        <Card>
          <Text variant="body" tone="secondary">
            Hisoblash…
          </Text>
        </Card>
      )}

      {data && (
        <>
          {data.summary.netProfit && (
            <Card glow="accent">
              <Row between>
                <Text variant="body" tone="secondary">
                  Sof foyda
                </Text>
                <Text variant="subtitle" style={{ color: 'var(--dh-accent)', fontWeight: 800 }}>
                  {data.summary.netProfit}
                </Text>
              </Row>
              <Row between style={{ marginTop: 6 }}>
                <Text variant="caption" tone="secondary">
                  Daromad {data.summary.income}
                </Text>
                <Text variant="caption" tone="secondary">
                  Xarajat {data.summary.expenses}
                </Text>
              </Row>
              <Row between style={{ marginTop: 4 }}>
                <Text variant="caption" tone="muted">
                  {data.summary.hours} soat · {data.summary.trips} ta haydov
                </Text>
                <Text variant="caption" tone="muted">
                  {data.summary.profitPerHour ? `${data.summary.profitPerHour}/soat` : 'foyda/soat — yo‘q'}
                </Text>
              </Row>
              {data.coverage < 0.7 && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '9px 12px',
                    borderRadius: tokens.radius.md,
                    background: 'var(--dh-warning-bg)',
                    fontSize: 12.5,
                    color: 'var(--dh-warning)',
                  }}
                >
                  ⚠️ Xarajatlar {Math.round(data.coverage * 100)}% kunlarda kiritilgan — sof foyda taxminiy.
                </div>
              )}
            </Card>
          )}

          {dailyData.length > 0 && (
            <Card style={{ marginTop: 12 }}>
              <Text variant="label" tone="muted">
                Kunlik
              </Text>
              <div style={{ height: 170, marginTop: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#6B7690', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis tick={{ fill: '#6B7690', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={40} />
                    <Tooltip
                      contentStyle={{ background: '#1B2438', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12.5 }}
                      labelStyle={{ color: '#F4F6FB' }}
                      formatter={(value: number, name: string) => [`${Math.round(value).toLocaleString('ru-RU')} so‘m`, name === 'income' ? 'Daromad' : 'Xarajat']}
                    />
                    <Bar dataKey="income" fill="#2BD9A3" radius={[3, 3, 0, 0]} maxBarSize={10} />
                    <Bar dataKey="expenses" fill="#FF5D6C" radius={[3, 3, 0, 0]} maxBarSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {weeklyData.length > 1 && (
            <Card style={{ marginTop: 12 }}>
              <Text variant="label" tone="muted">
                Haftalik sof foyda
              </Text>
              <div style={{ height: 150, marginTop: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#6B7690', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis tick={{ fill: '#6B7690', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={40} />
                    <Tooltip
                      contentStyle={{ background: '#1B2438', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12.5 }}
                      labelStyle={{ color: '#F4F6FB' }}
                      formatter={(value: number) => [`${Math.round(value).toLocaleString('ru-RU')} so‘m`, 'Sof foyda']}
                    />
                    <Line type="monotone" dataKey="net" stroke="#7C6CFF" strokeWidth={2.5} dot={{ r: 3, fill: '#7C6CFF', strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Insights */}
          {data.insights.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 6 }}>
                Xulosalar
              </Text>
              {data.insights.map((ins, i) => (
                <Card key={`${ins.type}-${i}`} style={{ marginTop: 6, padding: '12px 14px' }}>
                  <Row between align="start">
                    <div>
                      <Text variant="body" tone="text">
                        {ins.label}
                      </Text>
                      <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 2 }}>
                        {ins.value}
                      </Text>
                      {ins.detail && (
                        <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 2 }}>
                          {ins.detail}
                        </Text>
                      )}
                    </div>
                  </Row>
                </Card>
              ))}
            </div>
          )}

          {dailyData.length === 0 && (
            <EmptyState
              emoji="📊"
              title="Ma’lumotlar yetarli emas"
              hint="At least bitta daromad yoki xarajat yozuvini qo‘shing"
              action={<Link to="/money/new-income">Pul qo‘shish →</Link>}
            />
          )}
        </>
      )}
    </Screen>
  )
}