import { Outlet } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { FolderKanbanIcon } from 'lucide-react'
import { LayoutMenuLateral, type ItemMenu } from '@/components/MenuLateral'
import { buscarMeuPerfil, chavePerfil } from '@/features/auth/api'
import { useAuth } from '@/features/auth/useAuth'

// Sem `exato`: continua destacado dentro de um projeto/questionário
const menu: ItemMenu[] = [{ para: '/questionario', rotulo: 'Projetos', icone: <FolderKanbanIcon /> }]

/** Mesmo layout do admin: menu lateral no computador, barra superior + gaveta no celular. */
export function ClienteLayout() {
  const { user } = useAuth()
  const perfil = useQuery({
    queryKey: chavePerfil(user!.id),
    queryFn: () => buscarMeuPerfil(user!.id),
  })

  return (
    <LayoutMenuLateral inicio="/questionario" menu={menu} usuario={perfil.data?.matricula}>
      <Outlet />
    </LayoutMenuLateral>
  )
}
