import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { EllipsisVerticalIcon, PencilIcon, Trash2Icon } from 'lucide-react'
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
import { chavesAdmin, excluirProjeto, type Projeto } from './api'
import { ProjetoDialog } from './ProjetoDialog'

/** Renomear ou excluir um projeto (reabrir é por questionário, em AcoesAnexo). */
export function AcoesProjeto({ projeto, onExcluido }: { projeto: Projeto; onExcluido?: () => void }) {
  const queryClient = useQueryClient()
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [renomear, setRenomear] = useState(false)

  const exclusao = useMutation({
    mutationFn: () => excluirProjeto(projeto.id),
    onSuccess: async () => {
      setConfirmarExclusao(false)
      toast.success('Projeto excluído')
      queryClient.removeQueries({ queryKey: chavesAdmin.projeto(projeto.id) })
      onExcluido?.()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chavesAdmin.clientes }),
        queryClient.invalidateQueries({ queryKey: chavesAdmin.cliente(projeto.cliente_id) }),
        queryClient.invalidateQueries({ queryKey: chavesAdmin.usoQuestionarios }),
      ])
    },
    onError: (e) => {
      setConfirmarExclusao(false)
      toast.error(e.message)
    },
  })

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
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmarExclusao(true)}>
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

      <AlertDialog
        open={confirmarExclusao}
        onOpenChange={(a) => !a && !exclusao.isPending && setConfirmarExclusao(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto apaga "{projeto.nome}" e TODAS as respostas dele. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={exclusao.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={exclusao.isPending}
              onClick={(e) => {
                e.preventDefault()
                exclusao.mutate()
              }}
            >
              Excluir projeto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
