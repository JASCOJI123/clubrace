import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@driverhub/ui'
import { useAuth, isAdmin } from './stores/auth'

interface NavItem {
  to: string
  icon: string
  label: string
  exact?: boolean
}

const ADMIN_NAV: NavItem[] = [
  { to: '/', icon: '📊', label: 'Dashboard', exact: true },
  { to: '/drivers', icon: '👤', label: 'Haydovchilar' },
  { to: '/moderation', icon: '🛡️', label: 'Moderatsiya' },
  { to: '/broadcast', icon: '📣', label: 'Xabar yuborish' },
  { to: '/challenges', icon: '🏆', label: 'Challenges' },
  { to: '/settings', icon: '⚙️', label: 'Sozlamalar' },
  { to: '/support', icon: '🛟', label: 'Support' },
  { to: '/audit', icon: '📜', label: 'Audit log' },
]

const PARTNER_NAV: NavItem[] = [
  { to: '/partner', icon: '📊', label: 'Dashboard', exact: true },
  { to: '/partner/offers', icon: '🎁', label: 'Takliflar' },
  { to: '/partner/leads', icon: '🧲', label: 'Leadlar' },
]

/** App shell: fixed sidebar (desktop) / top header. Role-aware nav. */
export function ShellLayout() {
  const role = useAuth((s) => s.role)
  const name = useAuth((s) => s.name)
  const email = useAuth((s) => s.email)
  const clear = useAuth((s) => s.clear)
  const navigate = useNavigate()

  const nav = isAdmin(role) ? ADMIN_NAV : PARTNER_NAV

  function logout() {
    clear()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* sidebar */}
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          background: 'var(--dh-surface)',
          borderRight: '1px solid var(--dh-border)',
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '0 10px 18px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>
            🛠 DRIVER HUB
          </div>
          <div style={{ fontSize: 11, color: 'var(--dh-text-muted)', marginTop: 2 }}>
            Admin paneli
          </div>
        </div>

        <nav style={{ display: 'grid', gap: 2 }}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: isActive ? 'var(--dh-text)' : 'var(--dh-text-secondary)',
                background: isActive ? 'var(--dh-surface-3)' : 'transparent',
              })}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--dh-border)' }}>
          <div style={{ padding: '0 10px 8px' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{name ?? 'Foydalanuvchi'}</div>
            <div style={{ fontSize: 11, color: 'var(--dh-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email ?? role ?? ''}
            </div>
          </div>
          <Button size="sm" variant="ghost" block onClick={logout}>
            Chiqish
          </Button>
        </div>
      </aside>

      {/* content */}
      <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1200, minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}