import { create } from 'zustand'
import type { PublicUser } from '../lib/api'

interface AuthState {
  user: PublicUser | null
  loading: boolean
  error: string | null
  setUser: (user: PublicUser | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

/** Minimal auth store — the API token lives in localStorage; user object here. */
export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}))

export const isOnboarded = (user: PublicUser | null): boolean => user?.onboardingDone === true