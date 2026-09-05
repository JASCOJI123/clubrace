import { useEffect, type ReactNode } from 'react'
import { useNavigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './stores/auth'
import { AuthGate } from './features/auth/auth-gate'
import { Onboarding } from './features/onboarding/Onboarding'
import { Shell } from './app/Shell'
import { Home } from './features/home/Home'
import { Money } from './features/money/Money'
import { IncomeForm } from './features/money/IncomeForm'
import { ExpenseForm } from './features/money/ExpenseForm'
import { MoneyTable } from './features/money/MoneyTable'
import { Car } from './features/car/Car'
import { CarForm } from './features/car/CarForm'
import { MaintenanceForm } from './features/car/MaintenanceForm'
import { Cost } from './features/car/Cost'
import { Ai } from './features/ai/Ai'
import { Analytics } from './features/analytics/Analytics'
import { Profile } from './features/profile/Profile'
import { NotificationsSettings } from './features/profile/NotificationsSettings'
import { Referrals } from './features/profile/Referrals'
import { Settings } from './features/profile/Settings'
import { Pro } from './features/profile/Pro'
import { Leaderboard } from './features/extended/Leaderboard'
import { Club } from './features/extended/Club'
import { Marketplace } from './features/extended/Marketplace'
import { MarketplaceNew } from './features/extended/MarketplaceNew'
import { RoutesPage } from './features/extended/RoutesPage'
import { Challenges } from './features/extended/Challenges'
import { Support } from './features/extended/Support'

function Redirect({ to }: { to: string }) {
  const navigate = useNavigate()
  useEffect(() => {
    navigate(to, { replace: true })
  }, [navigate, to])
  return null
}

/** The three top-level gates: auth → onboarding (if needed) → app. */
function Router({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user)
  const loading = useAuth((s) => s.loading)
  if (loading) return <AuthGate />
  if (!user) return <AuthGate />
  if (user.onboardingDone !== true) return <Onboarding />
  return children
}

export function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/money" element={<Money />} />
          <Route path="/money/new-income" element={<IncomeForm />} />
          <Route path="/money/new-expense" element={<ExpenseForm />} />
          <Route path="/money/table" element={<MoneyTable />} />
          <Route path="/car" element={<Car />} />
          <Route path="/car/new" element={<CarForm />} />
          <Route path="/car/maintenance/new" element={<MaintenanceForm />} />
          <Route path="/car/cost" element={<Cost />} />
          <Route path="/ai" element={<Ai />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/notifications" element={<NotificationsSettings />} />
          <Route path="/profile/referrals" element={<Referrals />} />
          <Route path="/profile/settings" element={<Settings />} />
          <Route path="/profile/pro" element={<Pro />} />
          <Route path="/club" element={<Club />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/new" element={<MarketplaceNew />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/support" element={<Support />} />
        </Route>
        <Route path="*" element={<Redirect to="/" />} />
      </Routes>
    </Router>
  )
}