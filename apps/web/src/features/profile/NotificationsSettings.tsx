import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { miscApi } from '../../lib/api'

/** Notification preferences + quiet hours (spec §22). */
export function NotificationsSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['notif-prefs'],
    queryFn: miscApi.notifications.preferences,
  })
  const [telegram, setTelegram] = useState<boolean>(true)
  const [quietStart, setQuietStart] = useState('')
  const [quietEnd, setQuietEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setTelegram(data.prefs.telegramEnabled ?? true)
    const qs = data.prefs.quietHoursStart
    const qe = data.prefs.quietHoursEnd
    setQuietStart(qs != null ? `${Math.floor(qs / 60).toString().padStart(2, '0')}:${(qs % 60).toString().padStart(2, '0')}` : '')
    setQuietEnd(qe != null ? `${Math.floor(qe / 60).toString().padStart(2, '0')}:${(qe % 60).toString().padStart(2, '0')}` : '')
  }, [data])

  const save = async () => {
    setSaving(true)
    try {
      const toMin = (v: string) => {
        if (!v) return undefined
        const [h, m] = v.split(':').map(Number)
        return (h ?? 0) * 60 + (m ?? 0)
      }
      await miscApi.notifications.updatePreferences({
        telegramEnabled: telegram,
        quietHoursStart: toMin(quietStart),
        quietHoursEnd: toMin(quietEnd),
      })
      setMsg('Saqlandi')
      setTimeout(() => setMsg(null), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Bildirishnomalar" back />
      {isLoading && (
        <Card>
          <Text variant="body" tone="secondary">
            Yuklanmoqda…
          </Text>
        </Card>
      )}
      {data && (
        <>
          <Card>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 0' }}>
              <div>
                <Text variant="body">Telegram bildirishnomalari</Text>
                <Text variant="caption" tone="muted" style={{ display: 'block' }}>
                  Daromad/xarajat kunlik hisobot, servis va maqsad eslatmalari
                </Text>
              </div>
              <input type="checkbox" checked={telegram} onChange={(e) => setTelegram(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#2BD9A3' }} />
            </label>
          </Card>
          <Card style={{ marginTop: 12 }}>
            <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 8 }}>
              TINCH VAQT (bildirishnoma olmaysiz)
            </Text>
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1 }}>
                <Text variant="caption" tone="secondary">
                  Boshlanishi
                </Text>
                <input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} style={{ width: '100%', background: 'var(--dh-surface-2)', border: '1px solid var(--dh-border)', borderRadius: 8, padding: '10px 8px', color: 'var(--dh-text)' }} />
              </label>
              <label style={{ flex: 1 }}>
                <Text variant="caption" tone="secondary">
                  Tugashi
                </Text>
                <input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} style={{ width: '100%', background: 'var(--dh-surface-2)', border: '1px solid var(--dh-border)', borderRadius: 8, padding: '10px 8px', color: 'var(--dh-text)' }} />
              </label>
            </div>
            {quietStart && quietEnd && quietStart >= quietEnd && (
              <Text variant="caption" tone="warning" style={{ display: 'block', marginTop: 6 }}>
                Tun bo‘yi: misol 22:00 → 06:00 bir kechaga uziladi.
              </Text>
            )}
            <div style={{ marginTop: 14 }}>
              <Button size="sm" loading={saving} onClick={() => void save()}>
                Saqlash
              </Button>
            </div>
          </Card>
          <Card style={{ marginTop: 12 }}>
            <Text variant="caption" tone="muted" style={{ display: 'block', lineHeight: 1.55 }}>
              Eslatmalar <b>tinch vaqtda</b> o‘tkazib yuborilmaydi — keyingi ish soatiga suraman.
              Bildirishnoma o‘chirilgan bo‘lsa, DB da SKIPPED belgisi qo‘yiladi va qayta urinilmaydi.
            </Text>
          </Card>
          {msg && (
            <Text variant="caption" tone="success" style={{ display: 'block', marginTop: 10, textAlign: 'center' }}>
              {msg}
            </Text>
          )}
        </>
      )}
    </Screen>
  )
}