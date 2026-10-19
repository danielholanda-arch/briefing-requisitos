import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { EllipsisVerticalIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { chavesAdmin, excluirProjeto, reabrirBriefing, type Projeto } from './api'
import { ProjetoDialog } from './ProjetoDialog'

type Acao = 'reabrir' | 'excluir'

/** Reabrir, renomear ou excluir um projeto. */
export function AcoesProjeto({ projeto, onExcluido }: { projeto: Projeto; onExcluido?: () => void }) {
  const queryClient = useQueryClient()
  const [confirmar, setConfirmar] = useState<Acao | null>(null)
  const [renomear, setRenomear] = useState(false)

  const acao = useMutation({
    mutationFn: async (a: Acao) => {
      if (a === 'reabrir') {
        await reabrirBriefing(projeto.id)
        return 'Briefing reaberto para edição'
      }
      await excluirProjeto(projeto.id)
      return 'Projeto excluído'
    },
    onSuccess: async (mensagem, a) => {
      setConfirmar(null)
      toast.success(mensagem)
      if (a === 'excluir') {
        queryClient.removeQueries({ queryKey: chavesAdmin.projeto(projeto.id) })
        onExcluido?.()
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chavesAdmin.clientes }),
        queryClient.invalidateQueries({ queryKey: chavesAdmin.cliente(projeto.cliente_id) }),
        a === 'reabrir' && queryClient.invalidateQueries({ queryKey: chavesAdmin.projeto(projeto.id) }),
      ])
    },
    onError: (e) => {
      setConfirmar(null)
      toast.error(e.message)
    },
  })

  const textos = {
    reabrir: {
      titulo: 'Reabrir o briefing?',
      descricao: `O usuário poderá editar as respostas de "${projeto.nome}" e precisará enviar de novo.`,
      botao: 'Reabrir',
    },
    excluir: {
      titulo: 'Excluir o projeto?',
      descricao: `Isto apaga "${projeto.nome}" e TODAS as respostas dele. Não dá para desfazer.`,
      botao: 'Excluir projeto',
    },
  }
  const atual = confirmar ? textos[confirmar] : null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações do projeto ${projeto.nome}`}>
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenomear(true)}>
            <PencilIcon />
            Renomear
          </DropdownMenuItem>
          {projeto.status === 'concluido' && (
            <DropdownMenuItem onSelect={() => setConfirmar('reabrir')}>
              <RotateCcwIcon />
              Reabrir briefing
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmar('excluir')}>
            <Trash2Icon />
            Excluir projeto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjetoDialog
        clienteId={projeto.cliente_id}
        projeto={projeto}
        aberto={renomear}
        onAbertoChange={setRenomear}
      />

      <AlertDialog open={confirmar !== null} onOpenChange={(a) => !a && !acao.isPending && setConfirmar(null)}>
        <AlertDialogContent>
          {atual && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{atual.titulo}</AlertDialogTitle>
                <AlertDialogDescription>{atual.descricao}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={acao.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant={confirmar === 'excluir' ? 'destructive' : 'default'}
                  disabled={acao.isPending}
                  onClick={(e) => {
                    e.preventDefault()
                    if (confirmar) acao.mutate(confirmar)
                  }}
                >
                  {atual.botao}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
