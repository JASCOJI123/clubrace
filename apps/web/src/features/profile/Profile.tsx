import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, Progress, Row, Screen, Text } from '@driverhub/ui'
import { meApi } from '../../lib/api'
import { useAuth } from '../../stores/auth'
import { DRIVER_TYPE_LABEL } from '../../lib/format'

const COMPONENT_LABEL: Record<string, string> = {
  financialDiscipline: 'Moliyaviy intizom',
  consistency: 'Doimiylik',
  vehicleMaintenance: 'Mashina parvarishi',
  goalCompletion: 'Maqsadlar',
  communityActivity: 'Jamiyat faolligi',
  customerRating: 'Mijoz bahosi',
}

/** Profile hub (spec §5, §18). Score is transparent: each component 0-100. */
export function Profile() {
  const user = useAuth((s) => s.user)
  const score = useQuery({ queryKey: ['score'], queryFn: meApi.score })
  const me = useQuery({ queryKey: ['me'], queryFn: () => meApi.profile() })

  const components = (score.data?.components as Record<string, number> | null) ?? null
  const componentEntries = components ? Object.entries(components) : []

  return (
    <Screen>
      {/* header */}
      <Card glow="accent2">
        <Row between align="start">
          <div>
            <Text variant="title">{user?.name ?? 'Haydovchi'}</Text>
            <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 3 }}>
              {DRIVER_TYPE_LABEL[user?.driverType as string] ?? 'Faoliyat turi kiritilmagan'}
              {user?.phone ? ` · ${user.phone}` : ''}
            </Text>
            {user?.referralCode && (
              <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 3 }}>
                Referal kod: <b style={{ color: 'var(--dh-accent)' }}>{user.referralCode}</b>
              </Text>
            )}
          </div>
          {score.data?.score != null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--dh-accent-2)', lineHeight: 1 }}>{score.data.score}</div>
              <Text variant="caption" tone="muted">
                Driver Score
              </Text>
            </div>
          )}
        </Row>
        {me.data?.driver && (
          <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 6 }}>
            {formatLevel(me.data.driver.level)} · {me.data.driver.xp} XP
          </Text>
        )}
      </Card>

      {/* score breakdown */}
      {componentEntries.length > 0 && (
        <Card style={{ marginTop: 12 }}>
          <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 10 }}>
            Reyting tarkibi
          </Text>
          <div style={{ display: 'grid', gap: 10 }}>
            {componentEntries.map(([key, value]) => {
              if (value == null) return null
              return (
                <div key={key}>
                  <Row between>
                    <Text variant="caption" tone="secondary">
                      {COMPONENT_LABEL[key] ?? key}
                    </Text>
                    <Text variant="caption" tone="text" style={{ fontWeight: 700 }}>
                      {Math.round(value)}
                    </Text>
                  </Row>
                  <div style={{ marginTop: 4 }}>
                    <Progress value={value} color={value >= 70 ? 'var(--dh-accent)' : value >= 40 ? 'var(--dh-warning)' : 'var(--dh-danger)'} />
                  </div>
                </div>
              )
            })}
          </div>
          {!components?.customerRating && (
            <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 8 }}>
              Mijoz bahosi hali yo‘q — tarkibdan chiqarilgan (0 emas).
            </Text>
          )}
        </Card>
      )}

      {/* menu */}
      <MenuSection title="Jamiyat va bonuslar">
        <MenuRow to="/club" icon="💳" label="Driver Club chegirmalari" />
        <MenuRow to="/marketplace" icon="🛒" label="Marketplace" />
        <MenuRow to="/routes" icon="🛣" label="Yo‘nalishlar bozori" />
        <MenuRow to="/challenges" icon="🏆" label="Challenges" />
        <MenuRow to="/leaderboard" icon="🏅" label="Leaderboard" />
        <MenuRow to="/profile/referrals" icon="🤝" label="Referal dasturi" />
      </MenuSection>

      <MenuSection title="Hisob">
        <MenuRow to="/profile/pro" icon="⭐" label="PRO obuna" color="var(--dh-accent)" right={null} />
        <MenuRow to="/profile/notifications" icon="🔔" label="Bildirishnomalar" />
        <MenuRow to="/profile/settings" icon="⚙️" label="Sozlamalar va maxfiylik" />
        <MenuRow to="/support" icon="🛟" label="Yordam (Support)" />
      </MenuSection>
    </Screen>
  )
}

function formatLevel(level: string): string {
  const map: Record<string, string> = {
    ROOKIE: '🟢 Yangi boshlovchi',
    ACTIVE: '🔵 Faol',
    PRO: '🟣 Professional',
    ELITE: '🟠 Ekspert',
  }
  return map[level] ?? level
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 6 }}>
        {title}
      </Text>
      <div style={{ display: 'grid', gap: 6 }}>
        <Card padded={false} style={{ padding: '4px 6px' }}>
          {children}
        </Card>
      </div>
    </div>
  )
}

function MenuRow({ to, icon, label, right }: { to: string; icon: string; label: string; color?: string; right?: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 10px',
        textDecoration: 'none',
        color: 'inherit',
        borderRadius: 8,
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ flex: 1, color: 'var(--dh-text)', fontSize: 15, fontWeight: 500 }}>{label}</span>
      {right ?? <span style={{ color: 'var(--dh-text-muted)', fontSize: 15 }}>›</span>}
    </Link>
  )
}