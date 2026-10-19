import { Loader2Icon } from 'lucide-react'

export function TelaCarregando() {
  return (
    <div className="flex min-h-svh items-center justify-center" role="status" aria-live="polite">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Carregando…</span>
    </div>
  )
}
