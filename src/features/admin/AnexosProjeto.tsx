import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { EllipsisVerticalIcon, Loader2Icon, PlusIcon, RotateCcwIcon, UnlinkIcon } from 'lucide-react'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Catalogo, QuestionarioMontado } from '@/data/questions'
import type { Anexo, ProjetoComAnexos } from '@/data/status'
import { anexarQuestionario, chavesAdmin, reabrirQuestionario, removerQuestionario } from './api'

function useAtualizarProjeto(projeto: ProjetoComAnexos) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: chavesAdmin.projeto(projeto.id) }),
      queryClient.invalidateQueries({ queryKey: chavesAdmin.cliente(projeto.cliente_id) }),
      queryClient.invalidateQueries({ queryKey: chavesAdmin.clientes }),
      queryClient.invalidateQueries({ queryKey: chavesAdmin.usoQuestionarios }),
    ])
}

/** Seletor para anexar ao projeto um questionário que ele ainda não tem. */
export function AnexarQuestionario({ projeto, catalogo }: { projeto: ProjetoComAnexos; catalogo: Catalogo }) {
  const atualizar = useAtualizarProjeto(projeto)
  const [escolhido, setEscolhido] = useState('')
  const disponiveis = catalogo.lista.filter(
    (q) => !projeto.anexos.some((a) => a.questionario_id === q.info.id),
  )

  const anexar = useMutation({
    mutationFn: () => anexarQuestionario(projeto.id, escolhido),
    onSuccess: async () => {
      toast.success('Questionário anexado')
      setEscolhido('')
      await atualizar()
    },
    onError: (e) => toast.error(e.message),
  })

  if (disponiveis.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Select value={escolhido} onValueChange={setEscolhido}>
        <SelectTrigger className="w-64" aria-label="Questionário para anexar">
          <SelectValue placeholder="Escolha um questionário" />
        </SelectTrigger>
        <SelectContent>
          {disponiveis.map((q) => (
            <SelectItem key={q.info.id} value={q.info.id}>
              {q.info.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={() => anexar.mutate()} disabled={!escolhido || anexar.isPending}>
        {anexar.isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
        Anexar
      </Button>
    </div>
  )
}

/** Reabrir ou remover um questionário anexado ao projeto. */
export function AcoesAnexo({
  projeto,
  anexo,
  questionario,
  temRespostas,
}: {
  projeto: ProjetoComAnexos
  anexo: Anexo
  questionario: QuestionarioMontado
  /** Com respostas, o questionário não pode ser removido do projeto */
  temRespostas: boolean
}) {
  const atualizar = useAtualizarProjeto(projeto)
  const [confirmar, setConfirmar] = useState<'reabrir' | 'remover' | null>(null)

  const acao = useMutation({
    mutationFn: async (a: 'reabrir' | 'remover') => {
      if (a === 'reabrir') {
        await reabrirQuestionario(projeto.id, anexo.questionario_id)
        return 'Questionário reaberto'
      }
      await removerQuestionario(projeto.id, anexo.questionario_id)
      return 'Questionário removido do projeto'
    },
    onSuccess: async (mensagem) => {
      setConfirmar(null)
      toast.success(mensagem)
      await atualizar()
    },
    onError: (e) => {
      setConfirmar(null)
      toast.error(e.message)
    },
  })

  const podeReabrir = anexo.status === 'concluido'
  if (!podeReabrir && temRespostas) return null

  const textos = {
    reabrir: {
      titulo: `Reabrir ${questionario.info.nome}?`,
      descricao: 'O usuário poderá editar as respostas deste questionário e precisará enviar de novo.',
      botao: 'Reabrir',
    },
    remover: {
      titulo: `Remover ${questionario.info.nome} do projeto?`,
      descricao: 'O usuário deixa de ver este questionário. Nenhuma resposta foi dada ainda.',
      botao: 'Remover',
    },
  }
  const atual = confirmar ? textos[confirmar] : null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${questionario.info.nome}`} className="print:hidden">
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {podeReabrir && (
            <DropdownMenuItem onSelect={() => setConfirmar('reabrir')}>
              <RotateCcwIcon />
              Reabrir
            </DropdownMenuItem>
          )}
          {!temRespostas && (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmar('remover')}>
              <UnlinkIcon />
              Remover do projeto
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
                  variant={confirmar === 'remover' ? 'destructive' : 'default'}
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
