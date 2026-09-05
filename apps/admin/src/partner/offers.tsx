import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Field, Input, Select, Text, TextArea } from '@driverhub/ui'
import { partnerApi } from '../api'
import { shortDate } from '../format'
import { LoadingRows, PageHeader, Panel, SectionTitle, StatusBadge, Table, Td, ActionsRow } from '../components'

/** Partner offers (spec §21): CRUD + per-offer stats. New offers go to moderation. */
export function PartnerOffers() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['partner-offers'], queryFn: partnerApi.offers })
  const [open, setOpen] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discountText, setDiscountText] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [validUntil, setValidUntil] = useState('')

  const create = useMutation({
    mutationFn: () =>
      partnerApi.createOffer({
        title,
        description: description || undefined,
        discountText: discountText || undefined,
        category,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['partner-offers'] })
      void queryClient.invalidateQueries({ queryKey: ['partner-dashboard'] })
      setOpen(false)
      setTitle('')
      setDescription('')
      setDiscountText('')
      setValidUntil('')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => partnerApi.deleteOffer(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['partner-offers'] }),
  })

  return (
    <div>
      <PageHeader
        title="Takliflar"
        subtitle="Yangi takliflar moderatsiyadan o‘tadi"
        right={
          <Button size="sm" onClick={() => setOpen(!open)}>
            {open ? '✕ Yopish' : '+ Yangi taklif'}
          </Button>
        }
      />

      {open && (
        <Panel style={{ maxWidth: 560 }}>
          <SectionTitle>Yangi taklif</SectionTitle>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Nomi">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: 10% chegirma" />
            </Field>
            <Field label="Tavsif">
              <TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Chegirma matni">
              <Input value={discountText} onChange={(e) => setDiscountText(e.target.value)} placeholder="Masalan: −10%" />
            </Field>
            <Field label="Kategoriya">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="FUEL">Yoqilg‘i</option>
                <option value="SERVICE">Servis</option>
                <option value="CAR_WASH">Avtomoyka</option>
                <option value="FOOD">Ovqatlanish</option>
                <option value="INSURANCE">Sug‘urta</option>
                <option value="OTHER">Boshqa</option>
              </Select>
            </Field>
            <Field label="Amal qilish muddati">
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
            {create.isError && (
              <Text variant="caption" tone="danger">
                {(create.error as Error).message}
              </Text>
            )}
            <Button loading={create.isPending} disabled={!title.trim()} onClick={() => void create.mutateAsync()}>
              Taklifni yuborish
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
          <Text variant="body" tone="secondary">Hali takliflar yo‘q — birinchisini qo‘shing</Text>
        </Panel>
      )}

      {list.data && list.data.items.length > 0 && (
        <Table headers={['Taklif', 'Chegirma', 'Amal/qadar', 'Holat', 'Amallar']}>
          {list.data.items.map((o) => (
            <OfferRow key={o.id} offer={o} onRemove={(id) => void remove.mutateAsync(id)} />
          ))}
        </Table>
      )}
    </div>
  )
}

function OfferRow({ offer, onRemove }: { offer: { id: string; title: string; description: string | null; discountText: string | null; validUntil: string | null; status: string }; onRemove: (id: string) => void }) {
  return (
    <tr>
      <Td>
        <Text variant="body" style={{ fontWeight: 600 }}>{offer.title}</Text>
        {offer.description && <Text variant="caption" tone="muted" style={{ display: 'block' }}>{offer.description}</Text>}
      </Td>
      <Td>{offer.discountText ?? '—'}</Td>
      <Td>{shortDate(offer.validUntil)}</Td>
      <Td><StatusBadge status={offer.status} /></Td>
      <Td>
        <ActionsRow>
          <Button size="sm" variant="ghost" onClick={() => onRemove(offer.id)}>
            O‘chirish
          </Button>
        </ActionsRow>
      </Td>
    </tr>
  )
}