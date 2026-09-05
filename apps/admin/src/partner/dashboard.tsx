import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, Text } from '@driverhub/ui'
import { partnerApi } from '../api'
import { PageHeader, Panel, SectionTitle, StatCard, LoadingRows } from '../components'

/** Partner dashboard (spec §21): honest analytics — no fabricated revenue. */
export function PartnerDashboard() {
  const profile = useQuery({ queryKey: ['partner-profile'], queryFn: partnerApi.profile })
  const stats = useQuery({ queryKey: ['partner-dashboard'], queryFn: partnerApi.dashboard })

  const p = profile.data?.partner
  const s = stats.data

  return (
    <div>
      <PageHeader title="Hamkor paneli" subtitle="Takliflar va leadlar statistikasi" />

      {profile.isLoading && <LoadingRows rows={2} />}
      {profile.data && (
        <Panel>
          <SectionTitle>Profil</SectionTitle>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <Text variant="title" style={{ fontSize: 19 }}>
                {p!.businessName}
              </Text>
              <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 4 }}>
                {p!.category ?? '—'} · {p!.phone ?? '—'}
              </Text>
            </div>
            <Text variant="caption" tone="muted">
              {p!.status === 'APPROVED' ? '✓ Tasdiqlangan hamkor — taklif joylashing mumkin' : p!.status === 'PENDING' ? 'Moderatsiyada' : p!.status}
            </Text>
          </div>
        </Panel>
      )}

      {s && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
            <StatCard label="Ko‘rishlar" value={s.views} />
            <StatCard label="Kliklar" value={s.clicks} accent />
            <StatCard label="Leadlar" value={s.leads} />
            <StatCard label="Konvertatsiya" value={s.conversions} />
            <StatCard label="Takliflar" value={s.offerCount} />
          </div>

          <Panel>
            <SectionTitle>Daromad</SectionTitle>
            <Text variant="body" tone="secondary">
              {s.revenue === 0 ? 'Daromad hali o‘lchanmagan — u faqat to‘lov bilan bog‘langan amalga oshirishda hisoblanadi.' : s.revenue}
            </Text>
            <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 6 }}>
              {s.revenueNote}
            </Text>
          </Panel>
        </>
      )}
      {!s && !stats.isLoading && (
        <Panel>
          <Text variant="body" tone="secondary">Statistika hali yo‘q</Text>
        </Panel>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <Link to="/partner/offers" style={{ textDecoration: 'none' }}>
          <Card padded={false} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 20 }}>🎁</div>
            <Text variant="body" style={{ marginTop: 6 }}>Takliflar</Text>
          </Card>
        </Link>
        <Link to="/partner/leads" style={{ textDecoration: 'none' }}>
          <Card padded={false} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 20 }}>🧲</div>
            <Text variant="body" style={{ marginTop: 6 }}>Leadlar</Text>
          </Card>
        </Link>
      </div>
    </div>
  )
}