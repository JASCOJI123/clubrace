import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Field, Input, Screen, ScreenHeader, Select, Text, TextArea } from '@driverhub/ui'
import { extendedApi } from '../../lib/api'

/** Publish a marketplace listing — goes to PENDING moderation. */
export function MarketplaceNew() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: cats } = useQuery({ queryKey: ['marketplace-cats'], queryFn: extendedApi.marketplace.categories })

  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState('USED')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')

  const items = cats?.items ?? []
  const effectiveCategory = categoryId || items[0]?.id || ''

  const mutation = useMutation({
    mutationFn: () =>
      extendedApi.marketplace.create({
        categoryId: effectiveCategory,
        title: title.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        condition,
        location: location.trim() || undefined,
        contactPhone: phone.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      queryClient.invalidateQueries({ queryKey: ['my-listings'] })
      navigate('/marketplace')
    },
  })

  const valid = title.trim().length >= 3 && Number(price) >= 1000 && effectiveCategory !== ''

  return (
    <Screen>
      <ScreenHeader title="Elon qo‘shish" back />
      <Card style={{ marginTop: 8 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) mutation.mutate()
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Kategoriya">
              <Select value={effectiveCategory} onChange={(e) => setCategoryId(e.target.value)}>
                {items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ''}
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sarlavha">
              <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Chevrolet Cobalt shinalari R14" />
            </Field>
            <Field label="Narx (so‘m)">
              <Input type="text" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1500000" />
            </Field>
            <Field label="Holati">
              <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="NEW">Yangi</option>
                <option value="LIKE_NEW">Yangi qiyofada</option>
                <option value="USED">Ishlatilgan</option>
                <option value="SPARE_PARTS">Ehtiyot qismlar</option>
              </Select>
            </Field>
            <Field label="Shahar (ixtiyoriy)">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Toshkent" />
            </Field>
            <Field label="Aloqa telefoni (ixtiyoriy)">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
            </Field>
            <Field label="Tavsif (ixtiyoriy)">
              <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Holati, sababi, almashuv…" />
            </Field>
          </div>
          <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 12 }}>
            Elon moderatsiyadan o‘tgach chop etiladi (admin tasdiqlaydi).
          </Text>
          {mutation.isError && (
            <Text variant="caption" tone="danger" style={{ display: 'block', marginTop: 8 }}>
              {mutation.error instanceof Error ? mutation.error.message : 'Xatolik'}
            </Text>
          )}
          <div style={{ marginTop: 16 }}>
            <Button block type="submit" loading={mutation.isPending} disabled={!valid}>
              Moderatsiyaga yuborish
            </Button>
          </div>
        </form>
      </Card>
    </Screen>
  )
}