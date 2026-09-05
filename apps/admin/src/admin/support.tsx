import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Text, TextArea } from '@driverhub/ui'
import { adminApi } from '../api'
import { shortDateTime } from '../format'
import { LoadingRows, PageHeader, Panel, StatusBadge, Table, Td, ActionsRow } from '../components'

/** Support queue (spec §32): open tickets, reply, change status. */
export function SupportPage() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['admin-support'], queryFn: adminApi.support })
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')

  const reply = useMutation({
    mutationFn: (v: { id: string; body: string }) => adminApi.replySupport(v.id, v.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-support'] })
      setReplyTo(null)
      setReplyBody('')
    },
  })

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS' }) => adminApi.supportStatus(v.id, v.status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-support'] }),
  })

  return (
    <div>
      <PageHeader title="Support" subtitle="Ochiq chiptalar" />

      {list.isLoading && <LoadingRows rows={4} />}
      {list.isError && (
        <Panel>
          <Text variant="body" tone="danger">{(list.error as Error).message}</Text>
        </Panel>
      )}
      {list.data && list.data.items.length === 0 && (
        <Panel>
          <Text variant="body" tone="secondary">Ochiq chiptalar yo‘q — hammasi hal qilingan</Text>
        </Panel>
      )}

      {list.data && list.data.items.length > 0 && (
        <Table headers={['Mavzu', 'Muzokara', 'Foydalanuvchi', 'Muddati', 'Holat', 'Amallar']}>
          {list.data.items.map((t) => (
            <tr key={t.id}>
              <Td style={{ maxWidth: 240 }}>
                <Text variant="body" style={{ fontWeight: 600 }}>{t.subject}</Text>
                <Text variant="caption" tone="muted" style={{ display: 'block' }}>
                  {t.message}
                </Text>
              </Td>
              <Td>{t._count.messages} xab</Td>
              <Td>
                {t.user?.name ?? '—'}
                <Text variant="caption" tone="muted" style={{ display: 'block' }}>
                  {t.user?.phone ?? ''}
                </Text>
              </Td>
              <Td>{shortDateTime(t.createdAt)}</Td>
              <Td><StatusBadge status={t.status} /></Td>
              <Td>
                <ActionsRow>
                  <Button size="sm" variant="outline" onClick={() => setReplyTo(t.id)}>
                    ✎ Javob
                  </Button>
                  <Button size="sm" onClick={() => void setStatus.mutateAsync({ id: t.id, status: 'RESOLVED' })}>
                    ✓ Hal qilish
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void setStatus.mutateAsync({ id: t.id, status: 'CLOSED' })}>
                    Yopish
                  </Button>
                </ActionsRow>
                {replyTo === t.id && (
                  <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                    <TextArea rows={3} value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Javob matni…" />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="sm" loading={reply.isPending} disabled={!replyBody.trim()} onClick={() => void reply.mutateAsync({ id: t.id, body: replyBody })}>
                        Yuborish
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setReplyBody('') }}>
                        Bekor qilish
                      </Button>
                    </div>
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}