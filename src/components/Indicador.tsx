import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Cartão de número (ex.: "12 usuários"). */
export function Indicador({
  rotulo,
  valor,
  icone,
  destaque,
}: {
  rotulo: string
  valor: number | string
  icone: ReactNode
  destaque?: 'primario' | 'sucesso'
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4">
      <div
        className={cn(
          'absolute -top-10 -right-10 size-28 rounded-full blur-2xl',
          destaque === 'sucesso' ? 'bg-success/20' : destaque === 'primario' ? 'bg-primary/20' : 'bg-muted-foreground/10',
        )}
        aria-hidden
      />
      <div className="relative flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{rotulo}</span>
        <span className="text-muted-foreground [&_svg]:size-4">{icone}</span>
      </div>
      <p className="relative mt-2 font-mono text-3xl font-semibold tabular-nums">{valor}</p>
    </div>
  )
}

export function TituloPagina({
  sobretitulo,
  titulo,
  descricao,
  acoes,
}: {
  sobretitulo?: string
  titulo: ReactNode
  descricao?: ReactNode
  acoes?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {sobretitulo && (
          <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">{sobretitulo}</p>
        )}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <div className="mt-1 text-muted-foreground">{descricao}</div>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2 print:hidden">{acoes}</div>}
    </div>
  )
}
