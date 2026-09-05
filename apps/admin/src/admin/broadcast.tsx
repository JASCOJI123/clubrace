import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Badge, Button, Field, Input, Select, Text, TextArea } from '@driverhub/ui'
import { adminApi } from '../api'
import { DRIVER_TYPE_LABEL, LEVEL_LABEL } from '../format'
import { PageHeader, Panel, SectionTitle } from '../components'

type Audience = 'ALL_DRIVERS' | 'PRO_DRIVERS' | 'CITY' | 'DRIVER_TYPE' | 'LEVEL' | 'INACTIVE'

const AUDIENCE_LABEL: Record<Audience, string> = {
  ALL_DRIVERS: 'Barcha haydovchilar',
  PRO_DRIVERS: 'Faqat PRO',
  CITY: 'Shahar bo‘yicha',
  DRIVER_TYPE: 'Faoliyat turi bo‘yicha',
  LEVEL: 'Daraja bo‘yicha',
  INACTIVE: 'Faol bo‘lmaganlar',
}

/** Broadcast composer (spec §29): audience targeting, opt-out, delivery count. */
export function Broadcast() {
  const [text, setText] = useState('')
  const [audience, setAudience] = useState<Audience>('ALL_DRIVERS')
  const [city, setCity] = useState('')
  const [driverType, setDriverType] = useState('')
  const [level, setLevel] = useState('')

  const send = useMutation({
    mutationFn: () =>
      adminApi.broadcast({
        text,
        audience,
        ...(audience === 'CITY' && city ? { city } : {}),
        ...(audience === 'DRIVER_TYPE' && driverType ? { driverType } : {}),
        ...(audience === 'LEVEL' && level ? { level } : {}),
      }),
  })

  // Audience options that need an extra field
  const needField = audience === 'CITY' || audience === 'DRIVER_TYPE' || audience === 'LEVEL'

  return (
    <div>
      <PageHeader title="Xabar yuborish" subtitle="Maqsadli auditoriyaga bildirishnoma — push yuborish worker orqali (M7)" />

      <Panel style={{ maxWidth: 640 }}>
        <SectionTitle>Auditoriya</SectionTitle>
        <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
          {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
            <label
              key={a}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${audience === a ? 'var(--dh-accent)' : 'var(--dh-border)'}`,
                cursor: 'pointer',
                background: audience === a ? 'var(--dh-accent2-bg, rgba(124,108,255,0.14))' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="audience"
                checked={audience === a}
                onChange={() => setAudience(a)}
                style={{ accentColor: 'var(--dh-accent)' }}
              />
              <Text variant="body" style={{ fontSize: 14 }}>
                {AUDIENCE_LABEL[a]}
              </Text>
            </label>
          ))}
        </div>

        {needField && (
          <div style={{ marginBottom: 16 }}>
            {audience === 'CITY' && (
              <Field label="Shahar">
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Toshkent" />
              </Field>
            )}
            {audience === 'DRIVER_TYPE' && (
              <Field label="Faoliyat turi">
                <Select value={driverType} onChange={(e) => setDriverType(e.target.value)}>
                  <option value="">— tanlang —</option>
                  {Object.entries(DRIVER_TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {audience === 'LEVEL' && (
              <Field label="Daraja">
                <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="">— tanlang —</option>
                  {Object.entries(LEVEL_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}

        <Field label="Xabar matni">
          <TextArea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Haydovchilar qayerga xabar bermoqchisiz?"
            maxLength={4000}
          />
        </Field>

        {send.isError && (
          <Text variant="caption" tone="danger" style={{ display: 'block', marginTop: 10 }}>
            {(send.error as Error).message}
          </Text>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
          <Button loading={send.isPending} disabled={!text.trim()} onClick={() => void send.mutateAsync()}>
            Yuborish
          </Button>
          {send.data && (
            <Badge tone="success">
              ✓ {send.data.deliveredTo} ta foydalanuvchiga yuborildi
            </Badge>
          )}
        </div>

        {send.data && (
          <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 10 }}>
            {send.data.note}
          </Text>
        )}
      </Panel>
    </div>
  )
}