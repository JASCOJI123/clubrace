import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { PageLoader } from '@driverhub/ui'
import { Login } from './login'
import { ShellLayout } from './layout'
import { authApi, getToken } from './api'
import { useAuth, isAdmin, isPartner } from './stores/auth'
import { Dashboard } from './admin/dashboard'
import { Drivers, DriverDetail } from './admin/drivers'
import { Moderation } from './admin/moderation'
import { Broadcast } from './admin/broadcast'
import { Challenges } from './admin/challenges'
import { SettingsPage } from './admin/settings'
import { SupportPage } from './admin/support'
import { Audit } from './admin/audit'
import { PartnerDashboard } from './partner/dashboard'
import { PartnerOffers } from './partner/offers'
import { PartnerLeads } from './partner/leads'

/**
 * Admin + Partner panel router (spec §29-§31).
 * Guard: token present → we restore the session via /auth/whoami to learn
 * the actual role (ADMIN / MODERATOR / PARTNER) — never trust a client guess.
 */

function Gate() {
  const { userId, role, loading, setSession, clear } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!getToken()) {
      clear()
      return
    }
    if (userId) return
    let cancelled = false
    authApi
      .whoami()
      .then((user) => {
        if (cancelled) return
        const r = user?.role as 'ADMIN' | 'MODERATOR' | 'PARTNER'
        if (r !== 'ADMIN' && r !== 'MODERATOR' && r !== 'PARTNER') {
          clear()
          navigate('/login')
          return
        }
        setSession({
          userId: String(user?.id ?? ''),
          role: r,
          name: user?.name ? String(user.name) : null,
          email: user?.admin && typeof user.admin === 'object' && 'email' in (user.admin as object) ? String((user.admin as { email: unknown }).email) : null,
        })
      })
      .catch(() => {
        if (!cancelled) clear()
      })
    return () => {
      cancelled = true
    }
  }, [userId, navigate, setSession, clear])

  useEffect(() => {
    const handler = () => {
      clear()
      navigate('/login')
    }
    window.addEventListener('dh-auth-expired', handler)
    return () => window.removeEventListener('dh-auth-expired', handler)
  }, [clear, navigate])

  if (loading) return <PageLoader label="Panel yuklanmoqda…" />
  if (!getToken() || !userId || !role) return <Navigate to="/login" replace />
  return <ShellLayout />
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const role = useAuth((s) => s.role)
  if (!isAdmin(role)) return <Navigate to="/partner" replace />
  return <>{children}</>
}

function RequirePartner({ children }: { children: ReactNode }) {
  const role = useAuth((s) => s.role)
  if (!isPartner(role)) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Gate />}>
        {/* ---- admin / moderator routes ---- */}
        <Route path="/" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        <Route path="/drivers" element={<RequireAdmin><Drivers /></RequireAdmin>} />
        <Route path="/drivers/:id" element={<RequireAdmin><DriverDetail /></RequireAdmin>} />
        <Route path="/moderation" element={<RequireAdmin><Moderation /></RequireAdmin>} />
        <Route path="/broadcast" element={<RequireAdmin><Broadcast /></RequireAdmin>} />
        <Route path="/challenges" element={<RequireAdmin><Challenges /></RequireAdmin>} />
        <Route path="/settings" element={<RequireAdmin><SettingsPage /></RequireAdmin>} />
        <Route path="/support" element={<RequireAdmin><SupportPage /></RequireAdmin>} />
        <Route path="/audit" element={<RequireAdmin><Audit /></RequireAdmin>} />
        {/* ---- partner routes ---- */}
        <Route path="/partner" element={<RequirePartner><PartnerDashboard /></RequirePartner>} />
        <Route path="/partner/offers" element={<RequirePartner><PartnerOffers /></RequirePartner>} />
        <Route path="/partner/leads" element={<RequirePartner><PartnerLeads /></RequirePartner>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}