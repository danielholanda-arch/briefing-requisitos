import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { chavesAdmin, criarProjeto, renomearProjeto, type Projeto } from './api'

interface Props {
  clienteId: string
  /** Sem projeto: cria um novo. Com projeto: renomeia. */
  projeto?: Projeto
  /** Botão que abre o diálogo (modo não controlado) */
  gatilho?: ReactNode
  /** Modo controlado (ex.: aberto a partir de um menu) */
  aberto?: boolean
  onAbertoChange?: (aberto: boolean) => void
}

export function ProjetoDialog({ clienteId, projeto, gatilho, aberto: abertoExterno, onAbertoChange }: Props) {
  const queryClient = useQueryClient()
  const [abertoInterno, setAbertoInterno] = useState(false)
  const aberto = abertoExterno ?? abertoInterno
  const setAberto = (a: boolean) => (onAbertoChange ?? setAbertoInterno)(a)
  const [nome, setNome] = useState(projeto?.nome ?? '')
  const [abertoAntes, setAbertoAntes] = useState(aberto)
  // Ao abrir (inclusive no modo controlado), recomeça do nome atual
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto)
    if (aberto) setNome(projeto?.nome ?? '')
  }

  const salvar = useMutation({
    mutationFn: async () => {
      if (projeto) await renomearProjeto(projeto.id, nome)
      else await criarProjeto(clienteId, nome)
    },
    onSuccess: async () => {
      toast.success(projeto ? 'Projeto renomeado' : 'Projeto criado')
      setAberto(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chavesAdmin.cliente(clienteId) }),
        queryClient.invalidateQueries({ queryKey: chavesAdmin.clientes }),
        projeto && queryClient.invalidateQueries({ queryKey: chavesAdmin.projeto(projeto.id) }),
      ])
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (nome.trim()) salvar.mutate()
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(a) => {
        setAberto(a)
        if (!a) salvar.reset()
      }}
    >
      {gatilho && <DialogTrigger asChild>{gatilho}</DialogTrigger>}
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{projeto ? 'Renomear projeto' : 'Novo projeto'}</DialogTitle>
            <DialogDescription>
              {projeto
                ? 'O usuário passa a ver o nome novo.'
                : 'Cada projeto tem um briefing próprio.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="projeto-nome">Nome do projeto</Label>
            <Input
              id="projeto-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Aplicativo de agendamento"
              autoFocus
              required
            />
          </div>
          {salvar.error && (
            <Alert variant="destructive">
              <AlertDescription>{salvar.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending || !nome.trim()}>
              {salvar.isPending && <Loader2Icon className="animate-spin" />}
              {projeto ? 'Salvar' : 'Criar projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
