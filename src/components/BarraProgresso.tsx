import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export function BarraProgresso({
  feitas,
  total,
  className,
}: {
  feitas: number
  total: number
  className?: string
}) {
  const pct = total === 0 ? 0 : Math.round((feitas / total) * 100)
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Progress value={pct} className="h-1.5 flex-1" aria-label={`${pct}% respondido`} />
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {feitas}/{total}
      </span>
    </div>
  )
}
