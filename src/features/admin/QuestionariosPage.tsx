import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  CircleAlertIcon,
  ClipboardListIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { TituloPagina } from '@/components/Indicador'
import { TelaCarregando } from '@/components/TelaCarregando'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { LinhaQuestionario, QuestionarioMontado } from '@/data/questions'
import { chaves } from '@/features/questionario/api'
import { useCatalogo } from '@/features/questionario/useCatalogo'
import { chavesAdmin, contarUsoDosQuestionarios, excluirQuestionario, salvarQuestionario } from './api'

/** Lista de questionários (grupos de perguntas) que podem ser anexados aos projetos. */
export function QuestionariosPage() {
  const queryClient = useQueryClient()
  const catalogo = useCatalogo()
  const uso = useQuery({ queryKey: chavesAdmin.usoQuestionarios, queryFn: contarUsoDosQuestionarios })
  const [editar, setEditar] = useState<{ questionario?: LinhaQuestionario } | null>(null)
  const [excluir, setExcluir] = useState<QuestionarioMontado | null>(null)

  const exclusao = useMutation({
    mutationFn: (id: string) => excluirQuestionario(id),
    onSuccess: async () => {
      toast.success('Questionário excluído')
      setExcluir(null)
      await queryClient.invalidateQueries({ queryKey: chaves.catalogo })
    },
    onError: (e) => {
      setExcluir(null)
      toast.error(e.message)
    },
  })

  if (catalogo.isPending) return <TelaCarregando />
  if (catalogo.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Não foi possível carregar os questionários</AlertTitle>
        <AlertDescription>{catalogo.error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <TituloPagina
        sobretitulo="Grupos de perguntas"
        titulo="Questionários"
        descricao="Cada projeto responde os questionários anexados a ele."
        acoes={
          <Button onClick={() => setEditar({})}>
            <PlusIcon />
            Novo questionário
          </Button>
        }
      />

      {catalogo.data.lista.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-12 text-center">
          <ClipboardListIcon className="size-8 text-muted-foreground" />
          <p className="font-medium">Nenhum questionário cadastrado</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogo.data.lista.map((q) => {
            const projetos = uso.data?.get(q.info.id) ?? 0
            const podeExcluir = q.completo.length === 0 && projetos === 0
            return (
              <Card key={q.info.id} className="transition-shadow hover:shadow-lg hover:shadow-primary/10">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{q.info.nome}</CardTitle>
                    <div className="flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar questionário"
                        title="Editar nome e descrição"
                        onClick={() => setEditar({ questionario: q.info })}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Excluir questionário"
                        title={podeExcluir ? 'Excluir' : 'Só dá para excluir sem seções e sem projetos'}
                        disabled={!podeExcluir}
                        onClick={() => setExcluir(q)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                  {q.info.descricao && <p className="text-sm text-muted-foreground">{q.info.descricao}</p>}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {q.info.padrao && (
                    <Badge className="gap-1">
                      <StarIcon />
                      Padrão
                    </Badge>
                  )}
                  <Badge variant="secondary">{q.ativas.length} perguntas</Badge>
                  <Badge variant="outline">{q.secoes.length} seções</Badge>
                  <Badge variant="outline">
                    {projetos} projeto{projetos === 1 ? '' : 's'}
                  </Badge>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/admin/questionarios/${q.info.id}`}>
                      Editar perguntas
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <QuestionarioDialog
        aberto={editar !== null}
        questionario={editar?.questionario}
        onFechar={() => setEditar(null)}
      />

      <AlertDialog open={excluir !== null} onOpenChange={(a) => !a && !exclusao.isPending && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o questionário?</AlertDialogTitle>
            <AlertDialogDescription>"{excluir?.info.nome}" será removido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={exclusao.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={exclusao.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (excluir) exclusao.mutate(excluir.info.id)
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function QuestionarioDialog({
  aberto,
  questionario,
  onFechar,
}: {
  aberto: boolean
  questionario?: LinhaQuestionario
  onFechar: () => void
}) {
  const queryClient = useQueryClient()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [padrao, setPadrao] = useState(false)
  const [abertoAntes, setAbertoAntes] = useState(aberto)
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto)
    if (aberto) {
      setNome(questionario?.nome ?? '')
      setDescricao(questionario?.descricao ?? '')
      setPadrao(questionario?.padrao ?? false)
    }
  }

  const salvar = useMutation({
    mutationFn: () =>
      salvarQuestionario({
        ...(questionario ? { id: questionario.id } : {}),
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        padrao,
      }),
    onSuccess: async () => {
      toast.success(questionario ? 'Questionário atualizado' : 'Questionário criado')
      onFechar()
      await queryClient.invalidateQueries({ queryKey: chaves.catalogo })
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (nome.trim()) salvar.mutate()
  }

  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && !salvar.isPending && onFechar()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{questionario ? 'Editar questionário' : 'Novo questionário'}</DialogTitle>
            <DialogDescription>As perguntas são cadastradas depois, em "Editar perguntas".</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-nome">Nome *</Label>
            <Input
              id="q-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Odontologia, Fase 2"
              autoFocus
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-descricao">Descrição</Label>
            <Textarea id="q-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="q-padrao" checked={padrao} onCheckedChange={(c) => setPadrao(c === true)} />
            <Label htmlFor="q-padrao" className="flex-col items-start gap-0.5 font-normal">
              Padrão
              <span className="text-xs text-muted-foreground">Anexado automaticamente a todo projeto novo.</span>
            </Label>
          </div>
          {salvar.error && (
            <Alert variant="destructive">
              <AlertDescription>{salvar.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending || !nome.trim()}>
              {salvar.isPending && <Loader2Icon className="animate-spin" />}
              {questionario ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
