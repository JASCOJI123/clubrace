import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Field, Input, Text } from '@driverhub/ui'
import { authApi, setToken } from './api'
import { useAuth } from './stores/auth'

/**
 * Admin + Partner panel login.
 * - Admin: POST /auth/admin/login (email + bcrypt password, JWT, audit-logged).
 * - Demo: dev-login (only works when DEMO_MODE is on and not production — the API
 *   enforces this server-side; the button is honest about it).
 */

export function Login() {
  const navigate = useNavigate()
  const setSession = useAuth((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || password.length < 6) {
      setError('Email va parolni to‘g‘ri kiriting')
      return
    }
    setBusy(true)
    try {
      const res = await authApi.adminLogin(email.trim(), password)
      const role = res.user.role === 'PARTNER' || res.user.role === 'ADMIN' || res.user.role === 'MODERATOR' ? res.user.role : null
      if (!role) {
        setError('Bu hisob panel uchun ruxsatga ega emas')
        setBusy(false)
        return
      }
      setToken(res.token)
      setSession({ userId: res.user.id, role, name: res.user.name, email: res.user.email })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirish amalga oshmadi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 420, padding: 32 }}>
        <Text variant="hero" style={{ fontSize: 22 }}>
          🛠 DRIVER HUB
        </Text>
        <Text variant="caption" tone="secondary" style={{ display: 'block', marginTop: 4 }}>
          Admin & hamkor paneli
        </Text>

        <form onSubmit={submit} style={{ marginTop: 24, display: 'grid', gap: 14 }}>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@driverhub.uz"
              autoComplete="username"
            />
          </Field>
          <Field label="Parol">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>

          {error && (
            <Text variant="caption" tone="danger" style={{ display: 'block' }}>
              {error}
            </Text>
          )}

          <Button type="submit" block loading={busy}>
            Kirish
          </Button>
        </form>
      </Card>
    </div>
  )
}