import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { LogOutIcon, MenuIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AlternarTema } from '@/components/AlternarTema'
import { Marca } from '@/components/Marca'
import { Button } from '@/components/ui/button'
import { sair } from '@/features/auth/api'
import { cn } from '@/lib/utils'

export interface ItemMenu {
  para: string
  rotulo: string
  icone: ReactNode
  exato?: boolean
}

interface Props {
  inicio: string
  menu: ItemMenu[]
  /** Quem está logado (matrícula), no rodapé do menu */
  usuario?: ReactNode
  children: ReactNode
}

/**
 * Layout com menu lateral fixo (desktop) e gaveta (celular).
 * O menu é sempre escuro: a classe `dark` deixa os componentes no modo escuro.
 */
export function LayoutMenuLateral({ inicio, menu, usuario, children }: Props) {
  const [aberto, setAberto] = useState(false)
  const location = useLocation()

  // Fecha a gaveta ao trocar de página
  const [caminho, setCaminho] = useState(location.pathname)
  if (caminho !== location.pathname) {
    setCaminho(location.pathname)
    setAberto(false)
  }

  useEffect(() => {
    if (!aberto) return
    const fechar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [aberto])

  return (
    <div className="min-h-svh lg:pl-64">
      {/* Barra superior só no celular */}
      <header className="dark sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/5 bg-uc-grafite/95 px-4 text-foreground backdrop-blur-md lg:hidden print:hidden">
        <Button variant="ghost" size="icon-sm" onClick={() => setAberto(true)} aria-label="Abrir menu">
          <MenuIcon />
        </Button>
        <Link to={inicio}>
          <Marca compacta />
        </Link>
      </header>

      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setAberto(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'dark fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-uc-grafite text-foreground transition-transform duration-200 lg:translate-x-0 print:hidden',
          aberto ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Menu"
      >
        <div className="grade-futurista pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div
          className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-transparent via-uc-laranja/70 to-uc-verde/60"
          aria-hidden
        />

        <div className="relative flex h-16 items-center justify-between px-5">
          <Link to={inicio} className="rounded-lg outline-offset-4">
            <Marca />
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setAberto(false)}
            aria-label="Fechar menu"
          >
            <XIcon />
          </Button>
        </div>

        <nav aria-label="Principal" className="relative mt-4 flex flex-1 flex-col gap-1 px-3">
          {menu.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.exato}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground [&_svg]:size-4.5',
                  isActive &&
                    'bg-linear-to-r from-primary/20 to-transparent text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary before:shadow-[0_0_8px] before:shadow-primary [&_svg]:text-primary',
                )
              }
            >
              {item.icone}
              {item.rotulo}
            </NavLink>
          ))}
        </nav>

        <RodapeMenu usuario={usuario} />
      </aside>

      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">{children}</main>
    </div>
  )
}

function RodapeMenu({ usuario }: { usuario?: ReactNode }) {
  const logout = useMutation({
    mutationFn: sair,
    onError: () => toast.error('Não foi possível sair. Tente de novo.'),
  })

  return (
    <div className="relative flex items-center gap-2 border-t border-white/8 p-3">
      <div className="min-w-0 flex-1 truncate px-2 font-mono text-xs text-muted-foreground">{usuario}</div>
      <AlternarTema />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        aria-label="Sair"
        title="Sair"
      >
        <LogOutIcon />
      </Button>
    </div>
  )
}
