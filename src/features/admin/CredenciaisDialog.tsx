import { useState } from 'react'
import { CheckIcon, CopyIcon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Credenciais } from './api'

interface Props {
  credenciais: (Credenciais & { nome?: string }) | null
  titulo: string
  onClose: () => void
}

/** Mostra matrícula e senha provisória para o admin repassar ao usuário. */
export function CredenciaisDialog({ credenciais, titulo, onClose }: Props) {
  const [copiado, setCopiado] = useState(false)

  function fechar() {
    setCopiado(false)
    onClose()
  }

  async function copiar() {
    if (!credenciais) return
    const texto = [
      'Acesso ao briefing:',
      window.location.origin,
      '',
      `Matrícula: ${credenciais.matricula}`,
      `Senha: ${credenciais.senha}`,
      '',
      'No primeiro acesso, crie uma senha nova.',
    ]
      .filter((l) => l !== null)
      .join('\n')
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      toast.success('Mensagem copiada')
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie manualmente.')
    }
  }

  return (
    <Dialog
      open={credenciais !== null}
      onOpenChange={(aberto) => !aberto && fechar()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Envie estes dados para o usuário.</DialogDescription>
        </DialogHeader>
        {credenciais && (
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/50 p-4">
            <dt className="text-sm text-muted-foreground">Matrícula</dt>
            <dd className="font-mono text-lg select-all">{credenciais.matricula}</dd>
            <dt className="text-sm text-muted-foreground">Senha</dt>
            <dd className="font-mono text-lg select-all">{credenciais.senha}</dd>
          </dl>
        )}
        <Alert>
          <TriangleAlertIcon />
          <AlertDescription>
            Senha provisória: é trocada no primeiro acesso.
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button variant="outline" onClick={fechar}>
            Fechar
          </Button>
          <Button onClick={() => void copiar()}>
            {copiado ? <CheckIcon /> : <CopyIcon />}
            Copiar mensagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
