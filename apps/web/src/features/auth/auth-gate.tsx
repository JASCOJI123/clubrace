import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Spinner, Text, tokens } from '@driverhub/ui'
import { authApi, setToken, getToken } from '../../lib/api'
import { useAuth } from '../../stores/auth'
import { captureInitData, isMock, inTelegram, tg } from '../../lib/telegram'

/**
 * Login gate. Precedence:
 *  1. existing JWT → GET /auth/whoami (restores session)
 *  2. Telegram initData present → POST /auth/telegram (real Mini App)
 *  3. browser dev (VITE_TG_MOCK or no Telegram) → POST /auth/dev-login
 *     (only available with DEMO_MODE=true + a seeded DB)
 */
export function AuthGate() {
  const setUser = useAuth((s) => s.setUser)
  const setError = useAuth((s) => s.setError)
  const error = useAuth((s) => s.error)
  const [attempt, setAttempt] = useState(0)

  const run = useCallback(async () => {
    setError(null)
    // 1. session restore
    const existing = getToken()
    if (existing) {
      try {
        const me = await authApi.whoami()
        setUser(me)
        return
      } catch {
        setToken(null) // expired/invalid token → try a fresh login
      }
    }
    // 2. Telegram
    const initData = captureInitData()
    if (initData) {
      try {
        const res = await authApi.telegram(initData)
        setToken(res.token)
        setUser(res.user)
        return
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Xatolik'
        setError(msg)
        return
      }
    }
    // 3. browser dev shim — also covers the case where telegram-web-app.js
    //    was loaded from index.html (creating window.Telegram) but we are NOT
    //    actually inside Telegram (no initData, no real user in initDataUnsafe).
    const hasRealTelegramSession = inTelegram() && !!(tg().initDataUnsafe?.user?.id)
    if (isMock() || !hasRealTelegramSession) {
      try {
        const res = await authApi.devLogin()
        setToken(res.token)
        if (res.user) setUser(res.user)
        else setError('Demo foydalanuvchi topilmadi.')
        return
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Xatolik'
        setError(`${msg} (dev-login faqat DEMO_MODE + seed bilan ishlaydi)`)
        return
      }
    }
    setError('Ilova Telegram ichida ochilishi kerak.')
  }, [setError, setUser])

  useEffect(() => {
    void run()
  }, [run, attempt])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🚕</div>
        <Text variant="title" tone="text" style={{ display: 'block' }}>
          Driver Hub
        </Text>
        <Text variant="body" tone="secondary" style={{ display: 'block', margin: '6px 0 24px' }}>
          Haydovchi uchun shaxsiy moliyaviy tizim
        </Text>
        {error ? (
          <Card>
            <Text variant="body" tone="danger" style={{ display: 'block', marginBottom: 12 }}>
              {error}
            </Text>
            <Button block onClick={() => setAttempt((a) => a + 1)}>
              Qayta urinish
            </Button>
          </Card>
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', gap: 12 }}>
            <Spinner size={28} />
            <Text variant="body" tone="secondary">
              Kirish…
            </Text>
          </div>
        )}
        {isMock() && (
          <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 20 }}>
            Brauzer rejimi: VITE_TG_MOCK=1 · API DEMO_MODE=true bo‘lishi kerak
            <br />
            <span style={{ color: tokens.color.info }}>
              npm run db:seed va npm run dev:api ishga tushiring
            </span>
          </Text>
        )}
      </div>
    </div>
  )
}