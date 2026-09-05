import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Field, Input, Screen, ScreenHeader, Text } from '@driverhub/ui'
import { meApi } from '../../lib/api'
import { useAuth } from '../../stores/auth'

/** Settings + privacy + data export + delete (spec §30). Honest data export. */
export function Settings() {
  const user = useAuth((s) => s.user)
  const setUser = useAuth((s) => s.setUser)
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? '')
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [shareWeekly, setShareWeekly] = useState(true)
  const [busy, setBusy] = useState<'profile' | 'privacy' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const saveProfile = async () => {
    setBusy('profile')
    try {
      const res = await meApi.patchProfile({ name })
      setUser({ ...user!, ...res.user })
      setMsg('Profil saqlandi')
      setTimeout(() => setMsg(null), 2500)
    } finally {
      setBusy(null)
    }
  }

  const savePrivacy = async () => {
    setBusy('privacy')
    try {
      await meApi.privacy({ showInLeaderboard: showLeaderboard, shareWeekly })
      setMsg('Maxfiylik saqlandi')
      setTimeout(() => setMsg(null), 2500)
    } finally {
      setBusy(null)
    }
  }

  const exportData = async () => {
    const res = await meApi.export()
    const a = document.createElement('a')
    a.href = res.dataUrl
    a.download = res.fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setMsg('Ma’lumotlar yuklab olindi')
    setTimeout(() => setMsg(null), 2500)
  }

  const deleteAccount = async () => {
    await meApi.deleteAccount()
    navigate('/')
  }

  return (
    <Screen>
      <ScreenHeader title="Sozlamalar" back />
      <Card>
        <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 10 }}>
          PROFIL
        </Text>
        <Field label="Ism">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div style={{ marginTop: 12 }}>
          <Button size="sm" loading={busy === 'profile'} onClick={() => void saveProfile()}>
            Saqlash
          </Button>
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 10 }}>
          MAXFIYLIK (spec §18)
        </Text>
        <Toggle label="Leaderboardda ko‘rinish" checked={showLeaderboard} onChange={setShowLeaderboard} />
        <Toggle label="Haftalik natijani ulashish ma’lumotlariga ruxsat" checked={shareWeekly} onChange={setShareWeekly} />
        <div style={{ marginTop: 12 }}>
          <Button size="sm" loading={busy === 'privacy'} onClick={() => void savePrivacy()}>
            Saqlash
          </Button>
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 10 }}>
          MA’LUMOTLAR (GDPR)
        </Text>
        <Button block variant="outline" onClick={() => void exportData()}>
          📄 Ma’lumotlarimni yuklab olish (JSON)
        </Button>
        {!confirmDelete ? (
          <div style={{ marginTop: 10 }}>
            <Button block variant="danger" onClick={() => setConfirmDelete(true)}>
              🗑 Hisobni o‘chirish
            </Button>
          </div>
        ) : (
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            <Text variant="caption" tone="danger" style={{ display: 'block' }}>
              Rostdan ham o‘chirmoqchimisiz? Barcha ma’lumotlar bekor qilinadi (30 kunlik davr beriladi).
            </Text>
            <Button block variant="danger" onClick={() => void deleteAccount()}>
              Ha, o‘chirishni tasdiqlayman
            </Button>
            <Button block variant="outline" onClick={() => setConfirmDelete(false)}>
              Bekor qilish
            </Button>
          </div>
        )}
      </Card>

      {msg && (
        <Text variant="caption" tone="success" style={{ display: 'block', marginTop: 12, textAlign: 'center' }}>
          {msg}
        </Text>
      )}
    </Screen>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0' }}>
      <span style={{ fontSize: 14.5, color: 'var(--dh-text)' }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#2BD9A3' }} />
    </label>
  )
}