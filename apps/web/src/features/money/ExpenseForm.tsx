import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Field, Input, Screen, ScreenHeader, Select, Text, TextArea } from '@driverhub/ui'
import { moneyApi, uploadForm, type ExpenseCategory } from '../../lib/api'
import { CATEGORY_LABEL } from '../../lib/format'

const CATS = Object.keys(CATEGORY_LABEL) as ExpenseCategory[]

export function ExpenseForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('FUEL')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: () =>
      moneyApi.createExpense({
        amount: Number(amount.replace(/[\s.,]/g, '')),
        date,
        category,
        notes: notes || undefined,
        receiptUrl: receiptUrl ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['money'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      navigate('/money')
    },
  })

  const pickReceipt = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await uploadForm('/uploads/image', form)
      setReceiptUrl(res.url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rasm yuklashda xatolik')
    } finally {
      setUploading(false)
    }
  }

  const numeric = Number(amount.replace(/[\s.,]/g, ''))
  const valid = Number.isFinite(numeric) && numeric >= 100

  return (
    <Screen>
      <ScreenHeader title="Xarajat qo‘shish" back />
      <Card style={{ marginTop: 8 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) mutation.mutate()
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Summa (so‘m)">
              <Input autoFocus type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Masalan: 120000" />
            </Field>
            <Field label="Kategoriya">
              <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sana">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Chek rasmi (ixtiyoriy)" hint="Serverda tekshiriladi: rasm, o‘lcham va hajm">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => void pickReceipt(e.target.files?.[0])}
              />
              <Button variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
                {receiptUrl ? '🧾 Chek yuklangan' : '📎 Chek yuklash'}
              </Button>
            </Field>
            {receiptUrl && (
              <img src={receiptUrl} alt="chek" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />
            )}
            <Field label="Izoh (ixtiyoriy)">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Masalan: 55-litr gaz" />
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