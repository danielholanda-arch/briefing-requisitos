import { Outlet } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Cabecalho } from '@/components/Cabecalho'
import { buscarMeuPerfil, chavePerfil } from '@/features/auth/api'
import { useAuth } from '@/features/auth/useAuth'

export function ClienteLayout() {
  const { user } = useAuth()
  const perfil = useQuery({
    queryKey: chavePerfil(user!.id),
    queryFn: () => buscarMeuPerfil(user!.id),
  })

  return (
    <div className="min-h-svh">
      <Cabecalho inicio="/questionario" usuario={perfil.data?.matricula} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
