import { cn } from '@/lib/utils'

/** Logo da UniCatólica (mesmo desenho de public/logo-unicatolica.svg). */
export function LogoUniCatolica({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1125 1125" fill="#EC6A1D" className={className} aria-hidden>
      <path d="M12 0H269Q281 0 281 12V500A140.5 140.5 0 0 1 0 500V12Q0 0 12 0Z" />
      <path d="M348 0H550Q562 0 562 12V520A281 281 0 0 1 62 686A195.5 195.5 0 0 0 336 500V12Q336 0 348 0Z" />
      <path d="M629 0H831Q843 0 843 12V540A421 421 0 0 1 112 822A336 336 0 0 0 617 520V12Q617 0 629 0Z" />
      <path d="M910 0H1113Q1125 0 1125 12V562A562 562 0 0 1 166 953A476 476 0 0 0 898 540V12Q898 0 910 0Z" />
    </svg>
  )
}

/** Marca do sistema: logo + "UniCatólica · Briefing de Projeto". */
export function Marca({ className, compacta }: { className?: string; compacta?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoUniCatolica className="size-8 shrink-0 drop-shadow-[0_0_10px_rgb(236_106_29/0.45)]" />
      <span className="flex flex-col leading-none">
        <span className="font-semibold tracking-tight">UniCatólica</span>
        {!compacta && (
          <span className="mt-0.5 font-mono text-[0.65rem] tracking-[0.18em] text-white/55 uppercase">
            Briefing de Projeto
          </span>
        )}
      </span>
    </span>
  )
}
