import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Text } from '@driverhub/ui'
import { adminApi } from '../api'
import { shortDateTime } from '../format'
import { LoadingRows, PageHeader, Panel, Table, Td } from '../components'

/** Audit log viewer (spec §67) — every admin/moderator action, append-only. */
export function Audit() {
  const [cursor, setCursor] = useState<string | null>(null)
  const list = useQuery({
    queryKey: ['audit', cursor],
    queryFn: () => adminApi.audit({ cursor: cursor ?? undefined, take: 30 }),
  })

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Barcha admin/moderator amallari vaqt tartibida (append-only, o‘chirilmaydi)"
        right={
          <Button size="sm" variant="ghost" onClick={() => void list.refetch()}>
            Yangilash
          </Button>
        }
      />

      {list.isLoading && <LoadingRows rows={5} />}
      {list.isError && (
        <Panel>
          <Text variant="body" tone="danger">{(list.error as Error).message}</Text>
        </Panel>
      )}

      {list.data && (
        <>
          <Table headers={['Sana', 'Amal', 'Actor', 'Ob’yekt', 'Metadata']}>
            {list.data.items.map((a) => (
              <tr key={a.id}>
                <Td style={{ whiteSpace: 'nowrap' }}>{shortDateTime(a.createdAt)}</Td>
                <Td>
                  <Text variant="body" style={{ fontWeight: 600 }}>{a.action}</Text>
                </Td>
                <Td>
                  {a.actorRole ?? '—'}
                  <Text variant="caption" tone="muted" style={{ display: 'block' }}>
                    {short(a.actorId)}
                  </Text>
                </Td>
                <Td>
                  {a.targetType ?? '—'}
                  <Text variant="caption" tone="muted" style={{ display: 'block' }}>
                    {short(a.targetId)}
                  </Text>
                </Td>
                <Td>
                  <Text variant="caption" tone="secondary" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {formatMetadata(a.metadata)}
                  </Text>
                </Td>
              </tr>
            ))}
          </Table>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {cursor && (
              <Button size="sm" variant="ghost" onClick={() => setCursor(null)}>
                ← Birinchi sahifa
              </Button>
            )}
            {list.data.nextCursor ? (
              <Button size="sm" variant="outline" onClick={() => setCursor(list.data!.nextCursor)}>
                Keyingi →
              </Button>
            ) : (
              <Text variant="caption" tone="muted" style={{ alignSelf: 'center' }}>
                Oxiri
              </Text>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function short(id: string | null): string {
  if (!id) return '—'
  return id.length > 12 ? `${id.slice(0, 8)}…` : id
}

function formatMetadata(m: unknown): string {
  if (m == null) return '—'
  try {
    return JSON.stringify(m, null, 0)
  } catch {
    return String(m)
  }
}