import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { tokens } from '@driverhub/ui'
import { useAuth } from '../stores/auth'

/** Bottom navigation shell (spec §5). Five tabs, fixed, safe-area aware. */
const TABS = [
  { to: '/', label: 'Uy', icon: '🏠' },
  { to: '/money', label: 'Pul', icon: '💰' },
  { to: '/car', label: 'Mashina', icon: '🚗' },
  { to: '/ai', label: 'AI Coach', icon: '🤖' },
  { to: '/profile', label: 'Profil', icon: '👤' },
] as const

export function Shell() {
  const user = useAuth((s) => s.user)
  const location = useLocation()
  // Money sub-forms are full pages but still inside the tab shell — highlight Money.
  const activePrefix = location.pathname.split('/')[1] ?? ''

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      <Outlet />
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          background: 'rgba(20,27,44,0.96)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--dh-border)',
          display: 'flex',
          justifyContent: 'space-around',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          zIndex: 40,
        }}
      >
        {TABS.map((tab) => {
          const key = tab.to === '/' ? '' : tab.to.slice(1)
          const active = activePrefix === key
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '6px 0 4px',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span style={{ fontSize: 20, opacity: active ? 1 : 0.5, filter: active ? 'none' : 'grayscale(0.6)' }}>{tab.icon}</span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--dh-accent)' : 'var(--dh-text-muted)',
                }}
              >
                {tab.label}
              </span>
              {active && <span style={{ width: 16, height: 2, borderRadius: 2, background: tokens.color.accent }} />}
            </NavLink>
          )
        })}
      </nav>
      {user?.isDemo ? (
        <div
          style={{
            position: 'fixed',
            bottom: 74,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 45,
            background: 'var(--dh-warning-bg)',
            border: '1px solid rgba(255,176,32,0.35)',
            borderRadius: tokens.radius.full,
            padding: '4px 14px',
            fontSize: 11.5,
            color: 'var(--dh-warning)',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          DEMO ma’lumotlar — faqat sinab ko‘rish uchun
        </div>
      ) : null}
    </div>
  )
}