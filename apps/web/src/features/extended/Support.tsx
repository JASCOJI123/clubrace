import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Field, Input, Screen, ScreenHeader, Select, Text, TextArea } from '@driverhub/ui'
import { miscApi } from '../../lib/api'

/** Support tickets (spec §29) — create + track. */
export function Support() {
  const { data, refetch } = useQuery({ queryKey: ['tickets'], queryFn: miscApi.support.list })
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await miscApi.support.create({ subject: subject.trim(), message: message.trim(), category })
      setSubject('')
      setMessage('')
      setDone(true)
      setTimeout(() => setDone(false), 3000)
      refetch()
    } finally {
      setBusy(false)
    }
  }

  const valid = subject.trim().length >= 3 && message.trim().length >= 10

  return (
    <Screen>
      <ScreenHeader title="Yordam" back />
      <Card>
        <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 10 }}>
          Chipta yaratish
        </Text>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Mavzu">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Savolning qisqacha mazmuni" />
          </Field>
          <Field label="Kategoriya">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="GENERAL">Umumiy savol</option>
              <option value="FINANCE">Pul va hisob</option>
              <option value="TECHNICAL">Texnik xatolik</option>
              <option value="PARTNER">Hamkorlik</option>
            </Select>
          </Field>
          <Field label="Matn">
            <TextArea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Batafsil yozing — bunday javob beramiz" />
          </Field>
          <Button block loading={busy} disabled={!valid} onClick={() => void submit()}>
            Yuborish
          </Button>
          {done && (
            <Text variant="caption" tone="success" style={{ display: 'block', textAlign: 'center' }}>
              Chipta yuborildi — moderatsiya javob beradi ✓
            </Text>
          )}
        </div>
      </Card>

      {data && data.items.length > 0 && (
        <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
          <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 2 }}>
            SIZNING CHIPTALAR
          </Text>
          {data.items.map((t) => (
            <Card key={t.id} padded={false} style={{ padding: '12px 14px' }}>
              <Text variant="body">{t.subject}</Text>
              <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 2 }}>
                {new Date(t.createdAt).toLocaleDateString('uz-UZ')} · {t.status}
              </Text>
              {t.messages.length > 0 && (
                <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 6 }}>
                  {t.messages[t.messages.length - 1]?.body}
                </Text>
              )}
            </Card>
          ))}
        </div>
      )}
    </Screen>
  )
}