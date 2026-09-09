import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Field, Input, Select, Text, TextArea } from '@driverhub/ui'
import { adminApi } from '../api'
import { METRIC_LABEL, shortDate } from '../format'
import { ActionsRow, LoadingRows, PageHeader, Panel, SectionTitle, StatusBadge, Table, Td } from '../components'

/** Challenges CRUD (spec §29): create / start / finish challenges used by drivers. */
export function Challenges() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['admin-challenges'], queryFn: adminApi.challenges })
  const [open, setOpen] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [reward, setReward] = useState('')
  const [metric, setMetric] = useState('NET_PROFIT')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('DRAFT')

  const create = useMutation({
    mutationFn: () =>
      adminApi.createChallenge({
        name,
        description: description || undefined,
        reward: reward || undefined,
        metric,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-challenges'] })
      setOpen(false)
      setName('')
      setDescription('')
      setReward('')
      setStartDate('')
      setEndDate('')
    },
  })

  const patchStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => adminApi.patchChallenge(v.id, { status: v.status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-challenges'] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteChallenge(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-challenges'] }),
    onError: (err) => alert(err instanceof Error ? err.message : 'Xatolik'),
  })

  return (
    <div>
      <PageHeader
        title="Challenges"
        subtitle="Haydovchilar uchun motivatsion mashqlar (metrika + mukofot)"
        right={
          <Button size="sm" onClick={() => setOpen(!open)}>
            {open ? '✕ Yopish' : '+ Yangi challenge'}
          </Button>
        }
      />

      {open && (
        <Panel style={{ maxWidth: 560 }}>
          <SectionTitle>Yangi challenge</SectionTitle>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Nomi">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Haftada 5 kun ishlash" />
            </Field>
            <Field label="Tavsif">
              <TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Metrika">
              <Select value={metric} onChange={(e) => setMetric(e.target.value)}>
                {Object.entries(METRIC_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mukofot">
              <Input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Masalan: 50 000 so‘m" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Boshlanishi">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field label="Tugashi">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
            </div>
            <Field label="Holati">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="DRAFT">Qoralama</option>
                <option value="ACTIVE">Faol</option>
                <option value="FINISHED">Yakunlangan</option>
              </Select>
            </Field>
            {create.isError && (
              <Text variant="caption" tone="danger">
                {(create.error as Error).message}
              </Text>
            )}
            <Button
              loading={create.isPending}
              disabled={!name.trim() || !startDate || !endDate}
              onClick={() => void create.mutateAsync()}
            >
              Yaratish
            </Button>
          </div>
        </Panel>
      )}

      {list.isLoading && <LoadingRows rows={4} />}
      {list.isError && (
        <Panel>
          <Text variant="body" tone="danger">{(list.error as Error).message}</Text>
        </Panel>
      )}
      {list.data && list.data.items.length === 0 && (
        <Panel>
          <Text variant="body" tone="secondary">Challenjlar hali yo‘q</Text>
        </Panel>
      )}

      {list.data && list.data.items.length > 0 && (
        <Table headers={['Nomi', 'Metrika', 'Davr', 'Mukofot', 'Ishtirokchilar', 'Holat', 'Amallar']}>
          {list.data.items.map((c) => (
            <tr key={c.id}>
              <Td>
                <Text variant="body" style={{ fontWeight: 600 }}>{c.name}</Text>
                {c.description && (
                  <Text variant="caption" tone="muted" style={{ display: 'block' }}>
                    {c.description}
                  </Text>
                )}
              </Td>
              <Td>{METRIC_LABEL[c.metric] ?? c.metric}</Td>
              <Td>
                {shortDate(c.startDate)} — {shortDate(c.endDate)}
              </Td>
              <Td>{c.reward ?? '—'}</Td>
              <Td>{c._count.participants}</Td>
              <Td><StatusBadge status={c.status} /></Td>
              <Td>
                <ActionsRow>
                  {c.status === 'DRAFT' && (
                    <Button size="sm" onClick={() => void patchStatus.mutateAsync({ id: c.id, status: 'ACTIVE' })}>
                      ▶ Boshlash
                    </Button>
                  )}
                  {c.status === 'ACTIVE' && (
                    <Button size="sm" variant="outline" onClick={() => void patchStatus.mutateAsync({ id: c.id, status: 'FINISHED' })}>
                      ⏹ Yakunlash
                    </Button>
                  )}
                  {c._count.participants === 0 && (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={remove.isPending}
                      onClick={() => {
                        if (confirm(`"${c.name}" challenge-ni o‘chirmoqchimisiz?`)) void remove.mutateAsync(c.id)
                      }}
                    >
                      🗑 O‘chirish
                    </Button>
                  )}
                </ActionsRow>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}