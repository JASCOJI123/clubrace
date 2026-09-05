import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Field, Input, Screen, ScreenHeader, Select, Text } from '@driverhub/ui'
import { carApi } from '../../lib/api'

const SERVICES: Array<{ value: string; label: string }> = [
  { value: 'ENGINE_OIL', label: 'Dvigatel moyi' },
  { value: 'OIL_FILTER', label: 'Moy filtri' },
  { value: 'AIR_FILTER', label: 'Havo filtri' },
  { value: 'CABIN_FILTER', label: 'Salon filtri' },
  { value: 'BRAKE_PADS', label: 'Tormoz kolodkasi' },
  { value: 'TIRES', label: 'Shinalar' },
  { value: 'BATTERY', label: 'Akkumulyator' },
  { value: 'TECHNICAL_INSPECTION', label: 'Texnik ko‘rik' },
  { value: 'INSURANCE', label: 'Sug‘urta' },
  { value: 'OTHER', label: 'Boshqa' },
]

export function MaintenanceForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: cars } = useQuery({ queryKey: ['cars'], queryFn: carApi.list })

  const [carId, setCarId] = useState('')
  const [serviceType, setServiceType] = useState('ENGINE_OIL')
  const [cost, setCost] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [nextDueDate, setNextDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const items = cars?.items ?? []
  const activeCarId = carId || items.find((c) => c.isPrimary)?.id || items[0]?.id || ''

  const mutation = useMutation({
    mutationFn: () =>
      carApi.createMaintenance({
        carId: activeCarId,
        serviceType,
        date,
        cost: Number(cost),
        nextDueDate: nextDueDate || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-due'] })
      navigate('/car')
    },
  })

  const valid = Number(cost) >= 0 && activeCarId !== ''

  if (items.length === 0) {
    return (
      <Screen>
        <ScreenHeader title="Servis yozuvi" back />
        <Card>
          <Text variant="body" tone="secondary">
            Avval mashina qo‘shing — so‘ng servis kiritishingiz mumkin.
          </Text>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen>
      <ScreenHeader title="Servis yozuvi" back />
      <Card style={{ marginTop: 8 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) mutation.mutate()
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            {items.length > 1 && (
              <Field label="Mashina">
                <Select value={activeCarId} onChange={(e) => setCarId(e.target.value)}>
                  {items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Servis turi">
              <Select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                {SERVICES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Narxi (so‘m)">
              <Input autoFocus type="text" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Masalan: 420000" />
            </Field>
            <Field label="Sana">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Keyingi muddat (ixtiyoriy)" hint="Eslatma va {Red/Yellow/Green} belgilash uchun">
              <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
            </Field>
            <Field label="Izoh (ixtiyoriy)">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Masalan: 5W-30 sintetika" />
            </Field>
          </div>
          {mutation.isError && (
            <Text variant="caption" tone="danger" style={{ display: 'block', marginTop: 12 }}>
              {mutation.error instanceof Error ? mutation.error.message : 'Xatolik'}
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