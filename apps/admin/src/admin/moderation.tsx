import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, Field, Input, Text, tokens } from '@driverhub/ui'
import { adminApi } from '../api'
import { money, shortDate } from '../format'
import { LoadingRows, PageHeader, Panel, SectionTitle, StatusBadge, Table, Td, ActionsRow } from '../components'

type Tab = 'listings' | 'offers' | 'partners' | 'reports'

/** Moderation queues (spec §30): listings, partner offers, partners, reports. */
export function Moderation() {
  const [tab, setTab] = useState<Tab>('listings')

  return (
    <div>
      <PageHeader title="Moderatsiya" subtitle="Tasdiqlash / rad etish — har bir qaror audit logda qayd etiladi" />

      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {(
          [
            ['listings', 'E’lonlar'],
            ['offers', 'Hamkor takliflari'],
            ['partners', 'Hamkorlar'],
            ['reports', 'Shikoyatlar'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '9px 16px',
              borderRadius: tokens.radius.full,
              border: '1px solid var(--dh-border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              background: tab === key ? 'var(--dh-surface-3)' : 'transparent',
              color: tab === key ? 'var(--dh-text)' : 'var(--dh-text-secondary)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'listings' && <ListingQueue />}
      {tab === 'offers' && <OfferQueue />}
      {tab === 'partners' && <PartnerQueue />}
      {tab === 'reports' && <ReportQueue />}
    </div>
  )
}

/* ------------------------------- listings -------------------------------- */

function ListingQueue() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['mod-listings'], queryFn: adminApi.moderationListings })
  const mutate = useMutation({
    mutationFn: (v: { id: string; action: 'APPROVE' | 'REJECT' | 'REMOVE'; note?: string }) => adminApi.moderateListing(v.id, v.action, v.note),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['mod-listings'] }),
  })

  if (list.isLoading) return <LoadingRows rows={4} />
  if (list.isError) return <Card><Text variant="body" tone="danger">{(list.error as Error).message}</Text></Card>
  if (list.data?.items.length === 0) return <Empty text="Moderatsiya navbati bo‘sh" />

  return (
    <Table headers={['E’lon', 'Narx', 'Holat', 'Muallif', 'Amallar']}>
      {list.data!.items.map((l) => (
        <tr key={l.id}>
          <Td>
            <Text variant="body" style={{ fontWeight: 600 }}>{l.title}</Text>
            <Text variant="caption" tone="muted" style={{ display: 'block' }}>
              {l.category?.name ?? '—'} · {l.condition}
            </Text>
            {l.moderationNote && (
              <Text variant="caption" tone="warning" style={{ display: 'block' }}>
                Izoh: {l.moderationNote}
              </Text>
            )}
          </Td>
          <Td>{money(l.price)}</Td>
          <Td><StatusBadge status={l.status} /></Td>
          <Td>{l.user?.name ?? '—'}</Td>
          <Td>
            <ActionsRow>
              <Button size="sm" onClick={() => void mutate.mutateAsync({ id: l.id, action: 'APPROVE' })}>✓ Tasdiqlash</Button>
              <Button size="sm" variant="outline" onClick={() => void mutate.mutateAsync({ id: l.id, action: 'REJECT' })}>✕ Rad etish</Button>
              <Button size="sm" variant="danger" onClick={() => void mutate.mutateAsync({ id: l.id, action: 'REMOVE' })}>Olib tashlash</Button>
            </ActionsRow>
          </Td>
        </tr>
      ))}
    </Table>
  )
}

/* -------------------------------- offers --------------------------------- */

function OfferQueue() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['mod-offers'], queryFn: adminApi.moderationOffers })
  const mutate = useMutation({
    mutationFn: (v: { id: string; action: 'APPROVE' | 'REJECT' | 'SUSPEND' }) => adminApi.moderateOffer(v.id, v.action),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['mod-offers'] }),
  })

  if (list.isLoading) return <LoadingRows rows={4} />
  if (list.isError) return <Card><Text variant="body" tone="danger">{(list.error as Error).message}</Text></Card>
  if (list.data?.items.length === 0) return <Empty text="Takliflar navbati bo‘sh" />

  return (
    <Table headers={['Taklif', 'Chegirma', 'Amal/qadar', 'Hamkor', 'Holat', 'Amallar']}>
      {list.data!.items.map((o) => (
        <tr key={o.id}>
          <Td>
            <Text variant="body" style={{ fontWeight: 600 }}>{o.title}</Text>
            <Text variant="caption" tone="muted" style={{ display: 'block' }}>
              {o.description ?? '—'}
            </Text>
          </Td>
          <Td>{o.discountText ?? '—'}</Td>
          <Td>{shortDate(o.validUntil)}</Td>
          <Td>{o.partner?.businessName ?? '—'}</Td>
          <Td><StatusBadge status={o.status} /></Td>
          <Td>
            <ActionsRow>
              <Button size="sm" onClick={() => void mutate.mutateAsync({ id: o.id, action: 'APPROVE' })}>✓ Tasdiqlash</Button>
              <Button size="sm" variant="outline" onClick={() => void mutate.mutateAsync({ id: o.id, action: 'REJECT' })}>✕ Rad etish</Button>
              <Button size="sm" variant="danger" onClick={() => void mutate.mutateAsync({ id: o.id, action: 'SUSPEND' })}>⏸ To‘xtatish</Button>
            </ActionsRow>
          </Td>
        </tr>
      ))}
    </Table>
  )
}

/* -------------------------------- partners ------------------------------- */

function CreatePartnerForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutate = useMutation({
    mutationFn: () =>
      adminApi.createPartner({
        businessName: businessName.trim(),
        email: email.trim(),
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(category.trim() ? { category: category.trim() } : {}),
      }),
    onSuccess: () => {
      setBusinessName('')
      setEmail('')
      setPassword('')
      setPhone('')
      setCategory('')
      setOpen(false)
      onCreated()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Xatolik'),
  })

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} style={{ marginBottom: 14 }}>
        + Yangi hamkor qo‘shish
      </Button>
    )
  }

  return (
    <Card style={{ marginBottom: 18, padding: 20 }}>
      <Text variant="body" style={{ fontWeight: 600, display: 'block', marginBottom: 12 }}>
        Yangi hamkor qo‘shish
      </Text>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Field label="Biznes nomi">
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Masalan: AutoServis Plus" />
        </Field>
        <Field label="Kategoriya">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Masalan: avto-servis" />
        </Field>
        <Field label="Email (kirish uchun)">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hamkor@misol.uz" />
        </Field>
        <Field label="Parol">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kamida 6 belgi" />
        </Field>
        <Field label="Telefon">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
        </Field>
      </div>

      {error && (
        <Text variant="caption" tone="danger" style={{ display: 'block', marginTop: 10 }}>
          {error}
        </Text>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Button
          size="sm"
          loading={mutate.isPending}
          disabled={!businessName.trim() || !email.trim() || password.length < 6}
          onClick={() => {
            setError(null)
            void mutate.mutateAsync()
          }}
        >
          Yaratish
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          Bekor qilish
        </Button>
      </div>
    </Card>
  )
}

function PartnerQueue() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['mod-partners'], queryFn: adminApi.partners })
  const mutate = useMutation({
    mutationFn: (v: { id: string; status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' }) => adminApi.patchPartner(v.id, v.status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['mod-partners'] }),
  })

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['mod-partners'] })

  if (list.isLoading) return <LoadingRows rows={4} />
  if (list.isError) return <Card><Text variant="body" tone="danger">{(list.error as Error).message}</Text></Card>

  return (
    <div>
      <CreatePartnerForm onCreated={refresh} />
      {list.data?.items.length === 0 ? (
        <Empty text="Hamkorlar hali yo‘q" />
      ) : (
        <Table headers={['Biznes', 'Kategoriya', 'Takliflar', 'Holat', 'Amallar']}>
          {list.data!.items.map((p) => (
            <tr key={p.id}>
              <Td>
                <Text variant="body" style={{ fontWeight: 600 }}>{p.businessName}</Text>
                <Text variant="caption" tone="muted" style={{ display: 'block' }}>{p.user?.name ?? '—'} · {p.phone ?? '—'}</Text>
              </Td>
              <Td>{p.category ?? '—'}</Td>
              <Td>{p._count.offers}</Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td>
                <ActionsRow>
                  <Button size="sm" onClick={() => void mutate.mutateAsync({ id: p.id, status: 'APPROVED' })}>✓ Tasdiqlash</Button>
                  <Button size="sm" variant="outline" onClick={() => void mutate.mutateAsync({ id: p.id, status: 'REJECTED' })}>✕ Rad etish</Button>
                  <Button size="sm" variant="danger" onClick={() => void mutate.mutateAsync({ id: p.id, status: 'SUSPENDED' })}>⏸ To‘xtatish</Button>
                </ActionsRow>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

/* -------------------------------- reports -------------------------------- */

function ReportQueue() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['mod-reports'], queryFn: adminApi.reports })
  const mutate = useMutation({
    mutationFn: (v: { id: string; action: 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED' }) => adminApi.resolveReport(v.id, v.action),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['mod-reports'] }),
  })

  if (list.isLoading) return <LoadingRows rows={4} />
  if (list.isError) return <Card><Text variant="body" tone="danger">{(list.error as Error).message}</Text></Card>
  if (list.data?.items.length === 0) return <Empty text="Shikoyatlar yo‘q" />

  return (
    <Table headers={['Turi', 'Sabab', 'Muddati', 'Hisobot beruvchi', 'Amallar']}>
      {list.data!.items.map((r) => (
        <tr key={r.id}>
          <Td><Badge tone="info">{r.type}</Badge></Td>
          <Td>{r.reason ?? '—'}</Td>
          <Td>{shortDate(r.createdAt)}</Td>
          <Td>{r.reporter?.name ?? '—'}</Td>
          <Td>
            <ActionsRow>
              <Button size="sm" onClick={() => void mutate.mutateAsync({ id: r.id, action: 'ACTION_TAKEN' })}>Chora ko‘rildi</Button>
              <Button size="sm" variant="outline" onClick={() => void mutate.mutateAsync({ id: r.id, action: 'REVIEWED' })}>Ko‘rib chiqildi</Button>
              <Button size="sm" variant="ghost" onClick={() => void mutate.mutateAsync({ id: r.id, action: 'DISMISSED' })}>Rad etish</Button>
            </ActionsRow>
          </Td>
        </tr>
      ))}
    </Table>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <Panel>
      <SectionTitle>Navbat</SectionTitle>
      <Text variant="body" tone="secondary">{text}</Text>
    </Panel>
  )
}