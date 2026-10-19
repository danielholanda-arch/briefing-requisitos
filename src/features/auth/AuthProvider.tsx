import { useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { buscarPapeis } from './api'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [sessaoCarregada, setSessaoCarregada] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessaoCarregada(true)
    })

    const { data } = supabase.auth.onAuthStateChange((event, novaSessao) => {
      setSession(novaSessao)
      // Ao sair, nada do usuário anterior pode ficar no cache
      if (event === 'SIGNED_OUT') queryClient.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const userId = session?.user.id
  const papeis = useQuery({
    queryKey: ['papeis', userId],
    queryFn: () => buscarPapeis(userId!),
    enabled: !!userId,
    staleTime: Infinity,
  })

  const carregando = !sessaoCarregada || (!!userId && papeis.isPending)

  return (
    <AuthContext
      value={{
        session,
        user: session?.user ?? null,
        papeis: papeis.data ?? [],
        carregando,
      }}
    >
      {children}
    </AuthContext>
  )
}
