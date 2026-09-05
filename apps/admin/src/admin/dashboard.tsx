import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Badge, Card, Text } from '@driverhub/ui'
import { adminApi } from '../api'
import { money, shortDate } from '../format'
import { PageHeader, Panel, SectionTitle, StatCard, LoadingRows } from '../components'

/** Admin dashboard (spec §29): growth, monetization, moderation queues, activity. */
export function Dashboard() {
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats })
  const audit = useQuery({ queryKey: ['admin-audit-recent'], queryFn: () => adminApi.audit({ take: 10 }) })

  const s = stats.data

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Umumiy ko‘rsatkichlar — barcha raqamlar DB dan hisoblanadi"
        right={<Link to="/audit" style={{ fontSize: 13, color: 'var(--dh-info)', textDecoration: 'none' }}>Audit log →</Link>}
      />

      {stats.isLoading && <LoadingRows rows={3} />}
      {stats.isError && (
        <Card>
          <Text variant="body" tone="danger">
            Statistika yuklanmadi: {(stats.error as Error).message}
          </Text>
        </Card>
      )}

      {s && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <StatCard label="Jami foydalanuvchilar" value={s.total} hint={shortDate(new Date().toISOString())} />
            <StatCard label="Bugun yangi" value={s.todayNew} accent />
            <StatCard label="Haydovchilar" value={s.drivers} />
            <StatCard label="Demo akkauntlar" value={s.demoCount} />
            <StatCard label="PRO obunalar" value={s.proSubs} />
            <StatCard label="To‘lovlar (jami)" value={money(s.revenue)} hint="Faqat tasdiqlangan to‘lovlar" />
          </div>

          <Panel>
            <SectionTitle>Faollik (MAU)</SectionTitle>
            <div style={{ display: 'flex', gap: 24 }}>
              <Stat label="DAU" value={s.mau.dau} />
              <Stat label="WAU" value={s.mau.wau} />
              <Stat label="MAU" value={s.mau.mau} />
            </div>
          </Panel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginTop: 12 }}>
            <QueueCard to="/moderation" label="Moderatsiyada e’lonlar" count={s.pending.listings} emoji="🛒" />
            <QueueCard to="/moderation" label="Moderatsiyada takliflar" count={s.pending.offers} emoji="🎁" />
            <QueueCard to="/moderation" label="Shikoyatlar" count={s.pending.reports} emoji="🚩" />
            <QueueCard to="/support" label="Ochiq support chiptalar" count={s.supportOpen} emoji="🛟" />
          </div>
        </>
      )}

      <Panel>
        <SectionTitle>So‘nggi audit hodisalari</SectionTitle>
        {audit.isLoading && <LoadingRows rows={3} />}
        {audit.data && audit.data.items.length === 0 && (
          <Text variant="body" tone="secondary">
            Hozircha hech qanday admin amali qayd etilmagan.
          </Text>
        )}
        {audit.data && audit.data.items.length > 0 && (
          <div style={{ display: 'grid', gap: 6 }}>
            {audit.data.items.map((a) => (
              <Card
                key={a.id}
                padded={false}
                style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
              >
                <div style={{ minWidth: 0 }}>
                  <Text variant="body" style={{ display: 'block', fontWeight: 600 }}>
                    {actionLabel(a.action)}
                  </Text>
                  <Text variant="caption" tone="muted" style={{ display: 'block' }}>
                    {a.actorRole ?? 'admin'} · {a.targetType ?? '-'} {a.targetId ?? ''}
                  </Text>
                </div>
                <Text variant="caption" tone="secondary">
                  {shortDate(a.createdAt)}
                </Text>
              </Card>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <Text variant="caption" tone="muted" style={{ display: 'block' }}>
        {label}
      </Text>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
    </div>
  )
}

function QueueCard({ to, label, count, emoji }: { to: string; label: string; count: number; emoji: string }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <Card padded={false} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18 }}>{emoji}</div>
          <Text variant="body" tone="secondary" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
            {label}
          </Text>
        </div>
        {count > 0 ? <Badge tone="warning">{count}</Badge> : <Badge tone="neutral">0</Badge>}
      </Card>
    </Link>
  )
}

const ACTION_LABEL: Record<string, string> = {
  ADMIN_LOGIN: 'Admin tizimga kirdi',
  USER_SUSPEND: 'Foydalanuvchi to‘xtatildi',
  USER_BAN: 'Foydalanuvchi bloklandi',
  USER_RESTORE: 'Foydalanuvchi tiklandi',
  LISTING_APPROVE: 'E’lon tasdiqlandi',
  LISTING_REMOVE: 'E’lon olib tashlandi',
  OFFER_APPROVE: 'Taklif tasdiqlandi',
  OFFER_REJECT: 'Taklif rad etildi',
  BROADCAST_SENT: 'Xabar yuborildi',
  SETTINGS_CHANGED: 'Sozlamalar o‘zgardi',
}

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action
}