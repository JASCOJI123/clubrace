import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Field, Input, Screen, ScreenHeader, Select, Text } from '@driverhub/ui'
import { carApi } from '../../lib/api'

export function CarForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [plate, setPlate] = useState('')
  const [fuelType, setFuelType] = useState('PETROL')
  const [mileage, setMileage] = useState('')
  const [isPrimary, setIsPrimary] = useState(true)

  const mutation = useMutation({
    mutationFn: () =>
      carApi.create({
        brand: brand.trim(),
        model: model.trim(),
        fuelType,
        mileageKms: mileage ? Number(mileage) : 0,
        plate: plate.trim() || undefined,
        isPrimary,
        ...(year ? { year: Number(year) } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate('/car')
    },
  })

  const valid = brand.trim().length >= 1 && model.trim().length >= 1

  return (
    <Screen>
      <ScreenHeader title="Mashina qo‘shish" back />
      <Card style={{ marginTop: 8 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) mutation.mutate()
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Brend">
              <Input autoFocus value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Chevrolet" />
            </Field>
            <Field label="Model">
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Cobalt" />
            </Field>
            <Field label="Yil (ixtiyoriy)">
              <Input type="number" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2021" />
            </Field>
            <Field label="Davlat raqami (ixtiyoriy)">
              <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="01A123BB" />
            </Field>
            <Field label="Yoqilg‘i">
              <Select value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                <option value="PETROL">Benzin</option>
                <option value="DIESEL">Dizel</option>
                <option value="GAS">Metan / gaz</option>
                <option value="ELECTRIC">Elektr</option>
                <option value="HYBRID">Gibrid</option>
                <option value="OTHER">Boshqa</option>
              </Select>
            </Field>
            <Field label="Kilometraj (ixtiyoriy)">
              <Input type="text" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="45000" />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--dh-text)', fontSize: 14 }}>
              <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
              Asosiy mashina
            </label>
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