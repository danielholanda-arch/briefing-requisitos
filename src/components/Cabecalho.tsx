import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { LogOutIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AlternarTema } from '@/components/AlternarTema'
import { Marca } from '@/components/Marca'
import { Button } from '@/components/ui/button'
import { sair } from '@/features/auth/api'

interface Props {
  /** Destino ao clicar na marca */
  inicio?: string
  /** Texto à direita (ex.: matrícula de quem está logado) */
  usuario?: ReactNode
}

/**
 * Barra escura no topo (área do usuário e telas sem menu lateral).
 * A classe `dark` deixa os componentes no modo escuro nos dois temas.
 */
export function Cabecalho({ inicio = '/', usuario }: Props) {
  const logout = useMutation({
    mutationFn: sair,
    onError: () => toast.error('Não foi possível sair. Tente de novo.'),
  })

  return (
    <header className="dark sticky top-0 z-20 bg-uc-grafite/95 text-foreground backdrop-blur-md print:hidden">
      <div className="grade-futurista absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to={inicio} className="rounded-lg outline-offset-4" aria-label="Início">
          <Marca />
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          {usuario && (
            <span className="mr-1 hidden font-mono text-xs text-muted-foreground sm:inline">{usuario}</span>
          )}
          <AlternarTema />
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
            <LogOutIcon />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
      <div className="linha-neon h-px w-full opacity-80" aria-hidden />
    </header>
  )
}
