import { Badge } from '@/components/ui/badge'
import type { Enums } from '@/lib/database.types'
import { cn } from '@/lib/utils'

const estilos: Record<Enums<'briefing_status'>, { rotulo: string; ponto: string }> = {
  nao_iniciado: { rotulo: 'Não iniciado', ponto: 'bg-muted-foreground/60' },
  em_andamento: { rotulo: 'Em andamento', ponto: 'bg-primary shadow-[0_0_6px] shadow-primary' },
  concluido: { rotulo: 'Enviado', ponto: 'bg-success shadow-[0_0_6px] shadow-success' },
}

export function StatusBriefing({ status }: { status: Enums<'briefing_status'> }) {
  const e = estilos[status]
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className={cn('size-1.5 rounded-full', e.ponto)} aria-hidden />
      {e.rotulo}
    </Badge>
  )
}
