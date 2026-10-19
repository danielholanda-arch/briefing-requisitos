import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function NaoEncontrada() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground">Página não encontrada.</p>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
