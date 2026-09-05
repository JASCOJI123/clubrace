import { create } from 'zustand'
import { setToken } from '../api'

export type PanelRole = 'ADMIN' | 'MODERATOR' | 'PARTNER' | null

interface AuthState {
  userId: string | null
  role: PanelRole
  name: string | null
  email: string | null
  loading: boolean
  setSession: (s: { userId: string; role: PanelRole; name?: string | null; email?: string | null }) => void
  clear: () => void
}

export const useAuth = create<AuthState>((set) => ({
  userId: null,
  role: null,
  name: null,
  email: null,
  loading: true,
  setSession: (s) => set({ ...s, loading: false }),
  clear: () => {
    setToken(null)
    set({ userId: null, role: null, name: null, email: null, loading: false })
  },
}))

export const isAdmin = (role: PanelRole): boolean => role === 'ADMIN' || role === 'MODERATOR'
export const isPartner = (role: PanelRole): boolean => role === 'PARTNER'