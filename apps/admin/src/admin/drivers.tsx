import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, Input, Text } from '@driverhub/ui'
import { adminApi } from '../api'
import { shortDateTime, LEVEL_LABEL, statusTone } from '../format'
import { ActionsRow, LoadingRows, PageHeader, Panel, StatusBadge, SectionTitle, Table, Td } from '../components'

/** Driver management (spec §29): search, view, suspend/ban/verify. All audit-logged. */
export function Drivers() {
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const list = useQuery({
    queryKey: ['admin-drivers', q, cursor],
    queryFn: () => adminApi.drivers({ search: q || undefined, take: 25, cursor: cursor ?? undefined }),
  })

  const patch = useMutation({
    mutationFn: (v: { id: string; body: { isSuspended?: boolean; isBanned?: boolean; verify?: boolean } }) =>
      adminApi.patchDriver(v.id, v.body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-drivers'] }),
  })

  // debounce search input (new search resets pagination)
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim())
      setCursor(null)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const rows = list.data?.items ?? []

  return (
    <div>
      <PageHeader title="Haydovchilar" subtitle="Qidiruv, ko‘rish va hisob holatini boshqarish (har bir amal audit logda)" />

      <Input
        placeholder="Ism yoki telefon bo‘yicha qidirish…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 360, marginBottom: 16 }}
      />

      {list.isLoading && <LoadingRows rows={5} />}
      {list.isError && (
        <Card>
          <Text variant="body" tone="danger">
            {(list.error as Error).message}
          </Text>
        </Card>
      )}
      {!list.isLoading && rows.length === 0 && (
        <Card>
          <Text variant="body" tone="secondary">
            {q ? 'Hech narsa topilmadi' : 'Haydovchilar hali yo‘q'}
          </Text>
        </Card>
      )}

      {rows.length > 0 && (
        <Table headers={['Foydalanuvchi', 'Daraja', 'Score', 'Onbording', 'Holat', 'Amallar']}>
          {rows.map((d) => (
            <tr key={d.id}>
              <Td>
                <Link to={`/drivers/${d.id}`} style={{ color: 'var(--dh-text)', fontWeight: 600, textDecoration: 'none' }}>
                  {d.name ?? 'Ismsiz'}
                </Link>
                <Text variant="caption" tone="muted" style={{ display: 'block' }}>
                  {d.phone ?? '—'} {d.isDemo ? ' · demo' : ''}
                </Text>
              </Td>
              <Td>
                <Text variant="body">{LEVEL_LABEL[d.driver?.level ?? ''] ?? d.driver?.level ?? '—'}</Text>
                <Text variant="caption" tone="muted" style={{ display: 'block' }}>
                  {d.driver?.xp ?? 0} XP
                </Text>
              </Td>
              <Td>{d.driverScore?.score != null ? d.driverScore.score : '—'}</Td>
              <Td>{d.onboardingDone ? <Badge tone="success">✓</Badge> : <Badge tone="warning">Yo‘q</Badge>}</Td>
              <Td>
                <Badge tone={statusTone(d.isBanned ? 'BANNED' : d.isSuspended ? 'SUSPENDED' : 'ACTIVE')}>
                  {d.isBanned ? 'Bloklangan' : d.isSuspended ? 'To‘xtatilgan' : 'Faol'}
                </Badge>
              </Td>
              <Td>
                <ActionsRow>
                  <Button size="sm" variant="outline" onClick={() => void patch.mutateAsync({ id: d.id, body: { isSuspended: !d.isSuspended } })}>
                    {d.isSuspended ? 'Aktivlash' : 'To‘xtatish'}
                  </Button>
                  {!d.isBanned ? (
                    <Button size="sm" variant="danger" onClick={() => void patch.mutateAsync({ id: d.id, body: { isBanned: true } })}>
                      Bloklash
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => void patch.mutateAsync({ id: d.id, body: { isBanned: false } })}>
                      Tiklash
                    </Button>
                  )}
                </ActionsRow>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {list.data?.nextCursor ? (
          <Button size="sm" variant="outline" onClick={() => setCursor(list.data!.nextCursor)}>
            Keyingi →
          </Button>
        ) : (
          rows.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => void list.refetch()}>
              Yangilash
            </Button>
          )
        )}
      </div>
    </div>
  )
}

/** Single driver detail (admin): full profile + subscriptions + quick actions. */
export function DriverDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const detail = useQuery({ queryKey: ['admin-driver', id], queryFn: () => adminApi.driver(id!), enabled: !!id })

  const patch = useMutation({
    mutationFn: (body: { isSuspended?: boolean; isBanned?: boolean; verify?: boolean }) => adminApi.patchDriver(id!, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-driver', id] }),
  })

  const user = detail.data?.user as
    | {
        id: string
        name: string | null
        phone: string | null
        role: string
        isSuspended: boolean
        isBanned: boolean
        isDemo: boolean
        onboardingDone: boolean
        createdAt: string
        referralCode: string | null
        driver?: { driverType: string | null; level: string; xp: number; incomeTargetMonth: number | null; primaryGoal: string | null } | null
        driverScore?: { score: number | null; level: string | null } | null
        subscriptions?: { id: string; plan: string; status: string; expiresAt: string | null }[]
      }
    | undefined

  const driver = user?.driver

  return (
    <div>
      <PageHeader
        title={user?.name ?? 'Haydovchi'}
        subtitle={shortDateTime(user?.createdAt) ? 'Ro‘yxatdan o‘tgan' : undefined}
        right={
          <Button size="sm" variant="ghost" onClick={() => navigate('/drivers')}>
            ← Haydovchilar
          </Button>
        }
      />

      {detail.isLoading && <LoadingRows rows={4} />}
      {detail.isError && (
        <Card>
          <Text variant="body" tone="danger">
            {(detail.error as Error).message}
          </Text>
        </Card>
      )}

      {user && (
        <>
          <Panel>
            <SectionTitle>Hisob</SectionTitle>
            <div style={{ display: 'grid', gap: 6 }}>
              <InfoRow label="Telefon" value={user.phone ?? '—'} />
              <InfoRow label="Referal kod" value={user.referralCode ?? '—'} />
              <InfoRow label="Rol" value={user.role} />
              <InfoRow label="Onbording" value={user.onboardingDone ? 'Tugallagan' : 'Tugallanmagan'} />
              <InfoRow label="Holat" value={user.isBanned ? 'Bloklangan' : user.isSuspended ? 'To‘xtatilgan' : 'Faol'} />
              <InfoRow label="Ro‘yxat" value={shortDateTime(user.createdAt)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Button
                size="sm"
                variant="outline"
                loading={patch.isPending}
                onClick={() => void patch.mutateAsync({ isSuspended: !user.isSuspended })}
              >
                {user.isSuspended ? 'Aktivlash' : 'To‘xtatish'}
              </Button>
              {!user.isBanned ? (
                <Button size="sm" variant="danger" loading={patch.isPending} onClick={() => void patch.mutateAsync({ isBanned: true })}>
                  Bloklash
                </Button>
              ) : (
                <Button size="sm" variant="ghost" loading={patch.isPending} onClick={() => void patch.mutateAsync({ isBanned: false })}>
                  Blokdan chiqarish
                </Button>
              )}
            </div>
          </Panel>

          {driver && (
            <Panel>
              <SectionTitle>Haydovchi profili</SectionTitle>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <DetailStat label="Daraja" value={LEVEL_LABEL[driver.level] ?? driver.level} />
                <DetailStat label="XP" value={String(driver.xp)} />
                <DetailStat label="Driver Score" value={user.driverScore?.score != null ? String(user.driverScore.score) : '—'} />
                <DetailStat label="Maqsad (oylik)" value={driver.incomeTargetMonth != null ? `${driver.incomeTargetMonth.toLocaleString('ru-RU')} so'm` : '—'} />
              </div>
            </Panel>
          )}

          {user.subscriptions && user.subscriptions.length > 0 && (
            <Panel>
              <SectionTitle>Obunalar</SectionTitle>
              {user.subscriptions.map((sub) => (
                <Card key={sub.id} padded={false} style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
                  <Text variant="body" style={{ fontWeight: 600 }}>
                    {sub.plan}
                  </Text>
                  <StatusBadge status={sub.status} />
                  <Text variant="caption" tone="secondary">
                    {'gacha ' + shortDateTime(sub.expiresAt)}
                  </Text>
                </Card>
              ))}
            </Panel>
          )}
        </>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--dh-border)' }}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <Text variant="body" style={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Text>
    </div>
  )
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 140 }}>
      <Text variant="caption" tone="muted" style={{ display: 'block' }}>
        {label}
      </Text>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  )
}