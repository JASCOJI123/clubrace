import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card, CardSkeleton, ErrorState, IconBadge, MoneyText, Progress, Row, Screen, Text, tokens } from '@driverhub/ui'
import { meApi } from '../../lib/api'
import { useAuth } from '../../stores/auth'
import { greeting, money, formatHours, compactUzs, daysLeft } from '../../lib/format'
import { WorkSessionBanner } from '../../components/WorkSessionBanner'

/**
 * Home dashboard (spec §5, §7). All numbers come from /me/dashboard, computed
 * server-side over the driver's own records. The income-change % is `null`
 * until there is a comparable previous day — we render "—" instead of 0%.
 */
export function Home() {
  const user = useAuth((s) => s.user)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: meApi.dashboard,
  })

  return (
    <Screen>
      {isLoading && (
        <>
          <SkeletonBlock />
        </>
      )}
      {isError && <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />}
      {data && (
        <>
          <Header name={user?.name ?? 'Haydovchi'} />
          <WorkSessionBanner sessionId={data.workSessionId} />

          {/* Today */}
          <Card gradient="accent2" style={{ marginTop: 12 }}>
            <Row between>
              <Text variant="body" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Bugungi sof foyda
              </Text>
              {renderDelta(data.today.incomeChangePct)}
            </Row>
            <div style={{ marginTop: 4 }}>
              <MoneyText value={data.today.netProfit} size={32} sign style={{ color: '#fff' }} />
            </div>
            <Row style={{ marginTop: 14, gap: 8 }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.14)', borderRadius: tokens.radius.md, padding: '8px 10px' }}>
                <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                  Daromad
                </Text>
                <MoneyText value={data.today.income} size={14} style={{ color: '#fff' }} />
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.14)', borderRadius: tokens.radius.md, padding: '8px 10px' }}>
                <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                  Xarajat
                </Text>
                <MoneyText value={data.today.expenses} size={14} style={{ color: '#fff' }} />
              </div>
            </Row>
            <Row between style={{ marginTop: 10 }}>
              <Text variant="caption" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {formatHours(data.today.hours * 60 + data.today.minutes)} · {data.today.trips} ta haydov
              </Text>
              <Text variant="caption" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {compactUzs(data.today.profitPerHour)}/soat
              </Text>
            </Row>
            {data.today.expensesIncomplete && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  borderRadius: tokens.radius.md,
                  background: 'rgba(0,0,0,0.2)',
                  fontSize: 12.5,
                  color: '#fff',
                }}
              >
                ⚠️ Xarajatlar to‘liq kiritilmagan — foyda taxminiy.
              </div>
            )}
          </Card>

          {/* Quick actions */}
          <Row className="mt-3" style={{ marginTop: 14, gap: 8 }}>
            <QuickLink to="/money/new-income" icon="➕" gradient="accent" label="Daromad" />
            <QuickLink to="/money/new-expense" icon="➖" gradient="danger" label="Xarajat" />
            <QuickLink to="/money" icon="📒" gradient="info" label="Jurnal" />
          </Row>

          {/* Goal */}
          <GoalCard />

          {/* Score */}
          {data.driverScore !== null && (
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <Card style={{ marginTop: 12 }}>
                <Row between>
                  <div>
                    <Text variant="caption" tone="muted">
                      DRIVER SCORE
                    </Text>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--dh-accent-2)', marginTop: 2 }}>
                      {data.driverScore}
                    </div>
                  </div>
                  <Text variant="caption" tone="secondary">
                    Batafsil → Profil
                  </Text>
                </Row>
              </Card>
            </Link>
          )}

          {/* AI recommendation */}
          {data.aiRecommendation && (
            <Link to="/ai" style={{ textDecoration: 'none' }}>
              <Card style={{ marginTop: 12, borderColor: 'rgba(124,108,255,0.4)' }}>
                <Badge tone="accent">🤖 AI maslahat</Badge>
                <Text variant="body" tone="text" style={{ display: 'block', marginTop: 8, lineHeight: 1.55 }}>
                  {data.aiRecommendation}
                </Text>
              </Card>
            </Link>
          )}

          {/* Vehicles */}
          {data.vehicles.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <SectionTitle>Mashinalar</SectionTitle>
              {data.vehicles.slice(0, 3).map((v) => (
                <Card key={v.id} style={{ marginTop: 8, padding: '12px 14px' }}>
                  <Row between>
                    <div>
                      <Text variant="subtitle">{v.brand} {v.model}</Text>
                      <Text variant="caption" tone="secondary" style={{ display: 'block' }}>
                        {v.plate ? `№ ${v.plate} · ` : ''}
                        {v.mileageKms > 0 ? `${v.mileageKms.toLocaleString('ru-RU')} km` : 'km — noma’lum'}
                      </Text>
                    </div>
                    <Link to="/car" style={{ color: 'var(--dh-info)', fontSize: 13, textDecoration: 'none' }}>
                      Boshqarish →
                    </Link>
                  </Row>
                </Card>
              ))}
            </div>
          )}

          {/* Active challenges */}
          {data.activeChallenges.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <SectionTitle>Challenges</SectionTitle>
              {data.activeChallenges.map((c) => (
                <Card key={c.id} style={{ marginTop: 8, padding: '12px 14px' }}>
                  <Row between>
                    <Text variant="body">🏆 {c.name}</Text>
                    <Badge tone="info">{daysLeft(c.endDate) !== null ? `${daysLeft(c.endDate)} kun` : '—'}</Badge>
                  </Row>
                </Card>
              ))}
            </div>
          )}

          {/* Club offers */}
          {data.clubOffers.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <SectionTitle>Klub chegirmalari</SectionTitle>
              {data.clubOffers.slice(0, 3).map((o) => (
                <Card key={o.id} style={{ marginTop: 8, padding: '12px 14px' }}>
                  <Row between>
                    <div>
                      <Text variant="body">{o.title}</Text>
                      <Text variant="caption" tone="secondary" style={{ display: 'block' }}>
                        {o.partnerName}
                      </Text>
                    </div>
                    {o.discountText && <Badge tone="success">{o.discountText}</Badge>}
                  </Row>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </Screen>
  )
}

function SkeletonBlock() {
  return (
    <>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </>
  )
}

function Header({ name }: { name: string }) {
  return (
    <Row between style={{ marginBottom: 12 }}>
      <div>
        <Text variant="caption" tone="muted">
          {greeting()} 👋
        </Text>
        <Text variant="title">{name}</Text>
      </div>
      <Link to="/support" style={{ fontSize: 22, textDecoration: 'none' }} aria-label="yordam">
        🛟
      </Link>
    </Row>
  )
}

function renderDelta(pct: number | null) {
  if (pct === null) {
    return (
      <Badge tone="neutral">vs o‘tgan kun: —</Badge>
    )
  }
  const up = pct >= 0
  return (
    <Badge tone={up ? 'success' : 'danger'}>
      {up ? '▲' : '▼'} {Math.abs(pct)}% vs o‘tgan kun
    </Badge>
  )
}

function QuickLink({ to, icon, label, gradient = 'accent2' }: { to: string; icon: string; label: string; gradient?: 'accent' | 'accent2' | 'danger' | 'info' | 'warning' }) {
  return (
    <Link
      to={to}
      style={{
        flex: 1,
        textDecoration: 'none',
        background: 'var(--dh-surface-2)',
        border: '1px solid var(--dh-border)',
        borderRadius: tokens.radius.md,
        padding: '12px 8px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <IconBadge emoji={icon} gradient={gradient} size={32} />
      <div style={{ fontSize: 12, color: 'var(--dh-text-secondary)', fontWeight: 600 }}>{label}</div>
    </Link>
  )
}

function GoalCard() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: meApi.dashboard })
  const goal = data?.goal
  if (!goal) return null
  return (
    <Link to="/ai" style={{ textDecoration: 'none' }}>
      <Card style={{ marginTop: 12 }}>
        <Row between>
          <Text variant="body" tone="text">
            {goal.emoji} {goal.title}
          </Text>
          <Badge tone="accent">{goal.progressPct}%</Badge>
        </Row>
        <div style={{ marginTop: 10 }}>
          <Progress value={goal.progressPct} color={goal.progressPct >= 100 ? 'var(--dh-accent)' : 'var(--dh-accent-2)'} height={10} />
        </div>
        <Row between style={{ marginTop: 8 }}>
          <Text variant="caption" tone="secondary">
            {money(goal.savedAmount)} / {money(goal.targetAmount)}
          </Text>
          <Text variant="caption" tone="secondary">
            {goal.onPace === true ? 'Rejada 🟢' : goal.onPace === false ? 'Orqada 🔴' : 'Ma’lumot yetarli emas'}
          </Text>
        </Row>
        {goal.dailyTarget > 0 && (
          <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 4 }}>
            Kunlik maqsad: {money(goal.dailyTarget)}
          </Text>
        )}
      </Card>
    </Link>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 4 }}>
      {children}
    </Text>
  )
}