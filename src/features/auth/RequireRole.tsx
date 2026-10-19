import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Cabecalho } from '@/components/Cabecalho'
import { TelaCarregando } from '@/components/TelaCarregando'
import { buscarMeuPerfil, chavePerfil, type Papel } from './api'
import { TrocarSenhaForm } from './TrocarSenhaForm'
import { useAuth } from './useAuth'

export function RequireRole({ papel, children }: { papel: Papel; children: ReactNode }) {
  const { user, papeis, carregando } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()

  const autorizado = !!user && papeis.includes(papel)
  const perfil = useQuery({
    queryKey: chavePerfil(user?.id ?? ''),
    queryFn: () => buscarMeuPerfil(user!.id),
    enabled: autorizado,
  })

  if (carregando) return <TelaCarregando />
  if (!user) return <Navigate to="/login" replace state={{ de: location.pathname }} />
  if (!autorizado) return <Navigate to="/" replace />
  if (perfil.isPending) return <TelaCarregando />

  // Senha provisória (cadastro ou reset): só segue depois de criar uma senha própria
  if (perfil.data?.senha_provisoria) {
    return (
      <div className="min-h-svh">
        <Cabecalho />
        <main className="px-4 py-10">
          <TrocarSenhaForm
            onTrocada={() => queryClient.invalidateQueries({ queryKey: chavePerfil(user.id) })}
          />
        </main>
      </div>
    )
  }

  return children
}

/** Rota "/": manda cada um para a sua área. */
export function RedirecionarPorPapel() {
  const { user, papeis, carregando } = useAuth()

  if (carregando) return <TelaCarregando />
  if (!user) return <Navigate to="/login" replace />
  if (papeis.includes('admin')) return <Navigate to="/admin" replace />
  if (papeis.includes('cliente')) return <Navigate to="/questionario" replace />

  return <SemPapel />
}

function SemPapel() {
  return (
    <div className="min-h-svh">
      <Cabecalho />
      <p className="mx-auto max-w-sm p-6 text-center text-muted-foreground">
        Conta sem acesso liberado.
      </p>
    </div>
  )
}
