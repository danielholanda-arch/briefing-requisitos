import { useState, type ComponentProps, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ArchiveRestoreIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CircleAlertIcon,
  ListChecksIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { ROTULO_TIPO, type Pergunta, type Secao } from '@/data/questions'
import { chaves } from '@/features/questionario/api'
import { useCatalogo } from '@/features/questionario/useCatalogo'
import { cn } from '@/lib/utils'
import {
  chavesAdmin,
  contarRespostasPorPergunta,
  definirPerguntaAtiva,
  excluirPergunta,
  excluirSecao,
  gerarId,
  salvarSecao,
  trocarOrdem,
} from './api'
import { PerguntaDialog } from './PerguntaDialog'

type EdicaoPergunta = { secaoId: string; pergunta?: Pergunta } | null
type Exclusao = { tipo: 'secao'; secao: Secao } | { tipo: 'pergunta'; pergunta: Pergunta } | null

/** Editor das seções e perguntas de UM questionário (/admin/questionarios/:id). */
export function PerguntasPage() {
  const { id: questionarioId = '' } = useParams()
  const queryClient = useQueryClient()
  const catalogo = useCatalogo()
  const contagem = useQuery({ queryKey: chavesAdmin.contagemRespostas, queryFn: contarRespostasPorPergunta })

  const [editarPergunta, setEditarPergunta] = useState<EdicaoPergunta>(null)
  const [editarSecao, setEditarSecao] = useState<{ secao?: Secao } | null>(null)
  const [excluir, setExcluir] = useState<Exclusao>(null)

  const atualizar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: chaves.catalogo }),
      queryClient.invalidateQueries({ queryKey: chavesAdmin.contagemRespostas }),
    ])

  const mover = useMutation({
    mutationFn: (args: { tabela: 'secoes' | 'perguntas'; a: { id: string; ordem: number }; b: { id: string; ordem: number } }) =>
      trocarOrdem(args.tabela, args.a, args.b),
    onSuccess: atualizar,
    onError: (e) => toast.error(e.message),
  })

  const arquivar = useMutation({
    mutationFn: (p: Pergunta) => definirPerguntaAtiva(p.id, !p.ativa),
    onSuccess: async (_, p) => {
      toast.success(p.ativa ? 'Pergunta arquivada' : 'Pergunta reativada')
      await atualizar()
    },
    onError: (e) => toast.error(e.message),
  })

  const exclusao = useMutation({
    mutationFn: (alvo: NonNullable<Exclusao>) =>
      alvo.tipo === 'secao' ? excluirSecao(alvo.secao.id) : excluirPergunta(alvo.pergunta.id),
    onSuccess: async () => {
      toast.success('Excluído')
      setExcluir(null)
      await atualizar()
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
        <AlertTitle>Não foi possível carregar as perguntas</AlertTitle>
        <AlertDescription>{catalogo.error.message}</AlertDescription>
      </Alert>
    )
  }

  const questionario = catalogo.data.porId.get(questionarioId)
  if (!questionario) {
    return (
      <div className="flex flex-col gap-4">
        <Voltar />
        <Alert>
          <CircleAlertIcon />
          <AlertTitle>Questionário não encontrado</AlertTitle>
        </Alert>
      </div>
    )
  }

  const { completo, numero } = questionario
  const respostasDe = (id: string) => contagem.data?.get(id) ?? 0
  const proximaOrdem = (secaoId: string) =>
    Math.max(0, ...(completo.find((s) => s.id === secaoId)?.perguntas.map((p) => p.ordem) ?? [])) + 10
  const totalAtivas = questionario.ativas.length

  return (
    <div className="flex flex-col gap-8">
      <Voltar />
      <TituloPagina
        sobretitulo="Questionário"
        titulo={questionario.info.nome}
        descricao={`${totalAtivas} perguntas ativas em ${questionario.secoes.length} seções`}
        acoes={
          <Button onClick={() => setEditarSecao({})}>
            <PlusIcon />
            Nova seção
          </Button>
        }
      />

      {completo.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-12 text-center">
          <ListChecksIcon className="size-8 text-muted-foreground" />
          <p className="font-medium">Nenhuma seção ainda</p>
          <p className="text-sm text-muted-foreground">Crie uma seção para adicionar perguntas.</p>
        </div>
      )}

      {completo.map((secao, si) => (
        <Card key={secao.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs text-primary">Seção {String(si + 1).padStart(2, '0')}</p>
              <h2 className="text-lg font-semibold">{secao.titulo}</h2>
              {secao.descricao && <p className="text-sm text-muted-foreground">{secao.descricao}</p>}
            </div>
            <div className="flex items-center gap-1">
              <BotaoIcone
                rotulo="Subir seção"
                disabled={si === 0 || mover.isPending}
                onClick={() => mover.mutate({ tabela: 'secoes', a: secao, b: completo[si - 1] })}
              >
                <ArrowUpIcon />
              </BotaoIcone>
              <BotaoIcone
                rotulo="Descer seção"
                disabled={si === completo.length - 1 || mover.isPending}
                onClick={() => mover.mutate({ tabela: 'secoes', a: secao, b: completo[si + 1] })}
              >
                <ArrowDownIcon />
              </BotaoIcone>
              <BotaoIcone rotulo="Editar seção" onClick={() => setEditarSecao({ secao })}>
                <PencilIcon />
              </BotaoIcone>
              <BotaoIcone
                rotulo={secao.perguntas.length ? 'Só dá para excluir seção vazia' : 'Excluir seção'}
                disabled={secao.perguntas.length > 0}
                onClick={() => setExcluir({ tipo: 'secao', secao })}
              >
                <Trash2Icon />
              </BotaoIcone>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {secao.perguntas.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Seção vazia: só aparece no questionário quando tiver uma pergunta ativa.
              </p>
            )}
            {secao.perguntas.map((p, pi) => {
              const n = respostasDe(p.id)
              return (
                <div
                  key={p.id}
                  className={cn(
                    'flex flex-wrap items-center gap-3 rounded-lg border bg-background/50 px-3 py-2.5 transition-colors hover:border-primary/40',
                    !p.ativa && 'border-dashed opacity-60',
                  )}
                >
                  <span className="w-6 font-mono text-xs text-primary tabular-nums">
                    {p.ativa ? String(numero.get(p.id) ?? '').padStart(2, '0') : '—'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.titulo}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="secondary">{ROTULO_TIPO[p.tipo]}</Badge>
                      {p.obrigatoria && <Badge variant="outline">Obrigatória</Badge>}
                      {!p.ativa && (
                        <Badge variant="outline" className="gap-1">
                          <ArchiveIcon />
                          Arquivada
                        </Badge>
                      )}
                      {n > 0 && (
                        <Badge variant="outline" className="text-muted-foreground">
                          {n} resposta(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                  {/* No celular os botões ficam numa linha própria, alinhados à direita */}
                  <div className="flex w-full items-center justify-end gap-0.5 border-t pt-2 sm:w-auto sm:border-0 sm:pt-0">
                    <BotaoIcone
                      rotulo="Subir"
                      disabled={pi === 0 || mover.isPending}
                      onClick={() => mover.mutate({ tabela: 'perguntas', a: p, b: secao.perguntas[pi - 1] })}
                    >
                      <ArrowUpIcon />
                    </BotaoIcone>
                    <BotaoIcone
                      rotulo="Descer"
                      disabled={pi === secao.perguntas.length - 1 || mover.isPending}
                      onClick={() => mover.mutate({ tabela: 'perguntas', a: p, b: secao.perguntas[pi + 1] })}
                    >
                      <ArrowDownIcon />
                    </BotaoIcone>
                    <BotaoIcone rotulo="Editar" onClick={() => setEditarPergunta({ secaoId: secao.id, pergunta: p })}>
                      <PencilIcon />
                    </BotaoIcone>
                    <BotaoIcone
                      rotulo={p.ativa ? 'Arquivar' : 'Reativar'}
                      disabled={arquivar.isPending}
                      onClick={() => arquivar.mutate(p)}
                    >
                      {p.ativa ? <ArchiveIcon /> : <ArchiveRestoreIcon />}
                    </BotaoIcone>
                    <BotaoIcone
                      rotulo={n > 0 ? 'Tem respostas: arquive em vez de excluir' : 'Excluir'}
                      disabled={n > 0}
                      onClick={() => setExcluir({ tipo: 'pergunta', pergunta: p })}
                    >
                      <Trash2Icon />
                    </BotaoIcone>
                  </div>
                </div>
              )
            })}
            <Button
              variant="ghost"
              className="mt-1 self-start text-primary hover:text-primary"
              onClick={() => setEditarPergunta({ secaoId: secao.id })}
            >
              <PlusIcon />
              Nova pergunta
            </Button>
          </CardContent>
        </Card>
      ))}

      {completo.length > 0 && (
        <PerguntaDialog
          aberto={editarPergunta !== null}
          onAbertoChange={(a) => !a && setEditarPergunta(null)}
          secoes={completo}
          secaoId={editarPergunta?.secaoId ?? completo[0].id}
          pergunta={editarPergunta?.pergunta}
          respostas={editarPergunta?.pergunta ? respostasDe(editarPergunta.pergunta.id) : 0}
          proximaOrdem={proximaOrdem(editarPergunta?.secaoId ?? completo[0].id)}
        />
      )}

      <SecaoDialog
        questionarioId={questionarioId}
        aberto={editarSecao !== null}
        secao={editarSecao?.secao}
        proximaOrdem={Math.max(0, ...completo.map((s) => s.ordem)) + 10}
        onFechar={() => setEditarSecao(null)}
        onSalva={atualizar}
      />

      <AlertDialog open={excluir !== null} onOpenChange={(a) => !a && !exclusao.isPending && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{excluir?.tipo === 'secao' ? 'Excluir a seção?' : 'Excluir a pergunta?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {excluir?.tipo === 'secao'
                ? `"${excluir.secao.titulo}" será removida.`
                : excluir?.tipo === 'pergunta'
                  ? `"${excluir.pergunta.titulo}" será removida. Ninguém respondeu ainda, então nada se perde.`
                  : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={exclusao.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={exclusao.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (excluir) exclusao.mutate(excluir)
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

function Voltar() {
  return (
    <Button variant="ghost" size="sm" asChild className="self-start">
      <Link to="/admin/questionarios">
        <ArrowLeftIcon />
        Questionários
      </Link>
    </Button>
  )
}

function BotaoIcone({
  rotulo,
  children,
  ...props
}: { rotulo: string } & ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={rotulo} title={rotulo} {...props}>
      {children}
    </Button>
  )
}

function SecaoDialog({
  questionarioId,
  aberto,
  secao,
  proximaOrdem,
  onFechar,
  onSalva,
}: {
  questionarioId: string
  aberto: boolean
  secao?: Secao
  proximaOrdem: number
  onFechar: () => void
  onSalva: () => Promise<unknown>
}) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [abertoAntes, setAbertoAntes] = useState(aberto)
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto)
    if (aberto) {
      setTitulo(secao?.titulo ?? '')
      setDescricao(secao?.descricao ?? '')
    }
  }

  const salvar = useMutation({
    mutationFn: () =>
      salvarSecao({
        id: secao?.id ?? gerarId('s'),
        questionario_id: questionarioId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        ordem: secao?.ordem ?? proximaOrdem,
      }),
    onSuccess: async () => {
      toast.success(secao ? 'Seção atualizada' : 'Seção criada')
      onFechar()
      await onSalva()
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (titulo.trim()) salvar.mutate()
  }

  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && !salvar.isPending && onFechar()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{secao ? 'Editar seção' : 'Nova seção'}</DialogTitle>
            <DialogDescription>As seções agrupam as perguntas em etapas do questionário.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-titulo">Título *</Label>
            <Input id="s-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-descricao">Descrição</Label>
            <Textarea
              id="s-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              placeholder="Opcional: aparece abaixo do título"
            />
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
            <Button type="submit" disabled={salvar.isPending || !titulo.trim()}>
              {salvar.isPending && <Loader2Icon className="animate-spin" />}
              {secao ? 'Salvar' : 'Criar seção'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
