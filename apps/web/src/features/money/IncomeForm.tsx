import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Field, Input, Screen, ScreenHeader, Select, Text, TextArea } from '@driverhub/ui'
import { moneyApi, type IncomePlatform } from '../../lib/api'

const PLATFORMS: Array<{ value: IncomePlatform; label: string }> = [
  { value: 'YANDEX', label: 'Yandex Go' },
  { value: 'UBER', label: 'Uber' },
  { value: 'INDRIVE', label: 'inDrive' },
  { value: 'PRIVATE', label: 'Shaxsiy' },
  { value: 'DELIVERY', label: 'Dostavka' },
  { value: 'OTHER', label: 'Boshqa' },
]

export function IncomeForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [platform, setPlatform] = useState<IncomePlatform>('YANDEX')
  const [tripCount, setTripCount] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const mutation = useMutation({
    mutationFn: () =>
      moneyApi.createIncome({
        amount: Number(amount.replace(/[\s.,]/g, '')),
        date,
        platform,
        tripCount: tripCount ? Number(tripCount) : undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['money'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      navigate('/money')
    },
  })

  const numeric = Number(amount.replace(/[\s.,]/g, ''))
  const valid = Number.isFinite(numeric) && numeric >= 100

  return (
    <Screen>
      <ScreenHeader title="Daromad qo‘shish" back />
      <Card style={{ marginTop: 8 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) mutation.mutate()
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Summa (so‘m)">
              <Input autoFocus type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Masalan: 250000" />
            </Field>
            <Field label="Platforma">
              <Select value={platform} onChange={(e) => setPlatform(e.target.value as IncomePlatform)}>
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Haydovlar soni (ixtiyoriy)">
              <Input type="text" inputMode="numeric" value={tripCount} onChange={(e) => setTripCount(e.target.value)} placeholder="Masalan: 12" />
            </Field>
            <Field label="Sana">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Izoh (ixtiyoriy)">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Masalan: kechki smena" />
            </Field>
          </div>
          {mutation.isError && (
            <Text variant="caption" tone="danger" style={{ display: 'block', marginTop: 12 }}>
              {mutation.error instanceof Error ? mutation.error.message : 'Saqlashda xatolik'}
            </Text>
          )}
          <div style={{ marginTop: 20 }}>
            <Button block type="submit" loading={mutation.isPending} disabled={!valid}>
              Saqlash
            </Button>
          </div>
        </form>
      </Card>
    </Screen>
  )
}