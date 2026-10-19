import { cn } from '@/lib/utils'

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primeira = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}

/** Círculo com as iniciais do nome, no laranja da marca. */
export function Avatar({ nome, className }: { nome: string; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full bg-linear-135 from-uc-laranja/90 to-[#F4A574]/80 font-mono text-xs font-semibold text-uc-grafite ring-2 ring-primary/20',
        className,
      )}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  )
}
