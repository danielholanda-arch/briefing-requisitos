import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Papel } from './api'

export interface AuthState {
  session: Session | null
  user: User | null
  papeis: Papel[]
  /** true enquanto a sessão ou os papéis ainda estão sendo carregados */
  carregando: boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
