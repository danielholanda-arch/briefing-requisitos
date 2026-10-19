import { Outlet } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ClipboardListIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react'
import { LayoutMenuLateral, type ItemMenu } from '@/components/MenuLateral'
import { buscarMeuPerfil, chavePerfil } from '@/features/auth/api'
import { useAuth } from '@/features/auth/useAuth'

const menu: ItemMenu[] = [
  { para: '/admin', rotulo: 'Usuários', icone: <UsersIcon />, exato: true },
  { para: '/admin/questionarios', rotulo: 'Questionários', icone: <ClipboardListIcon /> },
  { para: '/admin/administradores', rotulo: 'Administradores', icone: <ShieldCheckIcon /> },
]

export function AdminLayout() {
  const { user } = useAuth()
  const perfil = useQuery({
    queryKey: chavePerfil(user!.id),
    queryFn: () => buscarMeuPerfil(user!.id),
  })

  return (
    <LayoutMenuLateral inicio="/admin" menu={menu} usuario={perfil.data?.matricula}>
      <Outlet />
    </LayoutMenuLateral>
  )
}
