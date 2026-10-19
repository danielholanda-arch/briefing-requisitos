import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTema } from '@/lib/tema'

export function AlternarTema() {
  const { tema, setTema } = useTema()
  const escuro = tema === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTema(escuro ? 'light' : 'dark')}
      aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
      title={escuro ? 'Tema claro' : 'Tema escuro'}
    >
      {escuro ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
