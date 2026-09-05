import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Text } from '@driverhub/ui'
import { partnerApi } from '../api'
import { shortDateTime } from '../format'
import { ActionsRow, LoadingRows, PageHeader, Panel, StatusBadge, Table, Td } from '../components'

/** Partner leads (spec §21): pipeline NEW → CONTACTED → CONVERTED / CLOSED. */
export function PartnerLeads() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['partner-leads'], queryFn: partnerApi.leads })

  const update = useMutation({
    mutationFn: (v: { id: string; status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED' }) => partnerApi.patchLead(v.id, v.status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['partner-leads'] }),
  })

  return (
    <div>
      <PageHeader title="Leadlar" subtitle="Takliflar orqali kelgan aloqalar" />

      {list.isLoading && <LoadingRows rows={4} />}
      {list.isError && (
        <Panel>
          <Text variant="body" tone="danger">{(list.error as Error).message}</Text>
        </Panel>
      )}
      {list.data && list.data.items.length === 0 && (
        <Panel>
          <Text variant="body" tone="secondary">Hali leadlar yo‘q</Text>
        </Panel>
      )}

      {list.data && list.data.items.length > 0 && (
        <Table headers={['Ism', 'Telefon', 'Manba', 'Holat', 'Vaqt', 'Amallar']}>
          {list.data.items.map((l) => (
            <tr key={l.id}>
              <Td>
                <Text variant="body" style={{ fontWeight: 600 }}>{l.name ?? '—'}</Text>
              </Td>
              <Td>{l.phone ?? '—'}</Td>
              <Td>{l.source}</Td>
              <Td><StatusBadge status={l.status} /></Td>
              <Td>{shortDateTime(l.createdAt)}</Td>
              <Td>
                <ActionsRow>
                  {l.status === 'NEW' && (
                    <Button size="sm" variant="outline" onClick={() => void update.mutateAsync({ id: l.id, status: 'CONTACTED' })}>
                      Bog‘landi
                    </Button>
                  )}
                  {l.status === 'CONTACTED' && (
                    <Button size="sm" onClick={() => void update.mutateAsync({ id: l.id, status: 'CONVERTED' })}>
                      ✓ Konvertatsiya
                    </Button>
                  )}
                  {l.status !== 'CLOSED' && l.status !== 'CONVERTED' && (
                    <Button size="sm" variant="ghost" onClick={() => void update.mutateAsync({ id: l.id, status: 'CLOSED' })}>
                      Yopish
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