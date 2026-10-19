import { useCallback, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleIcon,
  Loader2Icon,
  SendIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { BarraProgresso } from '@/components/BarraProgresso'
import { ResumoRespostas } from '@/components/ResumoRespostas'
import { StatusBriefing } from '@/components/StatusBriefing'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Questionario } from '@/data/questions'
import { contarTratadas, indexarRespostas, perguntaTratada, type Resposta } from '@/data/respostas'
import { buscarMeuPerfil, chavePerfil } from '@/features/auth/api'
import { useAuth } from '@/features/auth/useAuth'
import { cn, formatarDataHora } from '@/lib/utils'
import {
  buscarMeusProjetos,
  buscarProjeto,
  buscarRespostas,
  chaves,
  enviarBriefing,
  salvarResposta,
  type Projeto,
  type RascunhoResposta,
} from './api'
import { QuestionField } from './QuestionField'
import { useQuestionario } from './useQuestionario'

export function BriefingPage() {
  const { projetoId = '' } = useParams()
  const { user } = useAuth()
  const userId = user!.id

  const perfil = useQuery({ queryKey: chavePerfil(userId), queryFn: () => buscarMeuPerfil(userId) })
  const questionario = useQuestionario()
  const projeto = useQuery({ queryKey: chaves.projeto(projetoId), queryFn: () => buscarProjeto(projetoId) })
  const meusProjetos = useQuery({
    queryKey: chaves.meusProjetos(userId),
    queryFn: () => buscarMeusProjetos(userId),
  })
  const respostas = useQuery({
    queryKey: chaves.respostas(projetoId),
    queryFn: () => buscarRespostas(projetoId),
    // Os campos guardam o próprio estado; recarregar no meio da edição só atrapalharia
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  if (perfil.isPending || questionario.isPending || projeto.isPending || respostas.isPending) {
    return <TelaCarregando />
  }

  if (perfil.isError || questionario.isError || projeto.isError || respostas.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Não foi possível carregar o questionário</AlertTitle>
        <AlertDescription>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!projeto.data) {
    return (
      <Alert>
        <CircleAlertIcon />
        <AlertTitle>Projeto não encontrado</AlertTitle>
        <AlertDescription>
          <Link to="/questionario" className="underline underline-offset-2">
            Voltar para os meus projetos
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  if (!perfil.data.ativo) {
    return (
      <Alert>
        <CircleAlertIcon />
        <AlertTitle>Acesso desativado</AlertTitle>
      </Alert>
    )
  }

  const variosProjetos = (meusProjetos.data?.length ?? 0) > 1

  return (
    <div className="flex flex-col gap-6">
      {variosProjetos && (
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link to="/questionario">
            <ArrowLeftIcon />
            Meus projetos
          </Link>
        </Button>
      )}
      {projeto.data.status === 'concluido' ? (
        <BriefingEnviado
          projeto={projeto.data}
          questionario={questionario.data}
          respostas={respostas.data}
        />
      ) : (
        <Questionario
          projeto={projeto.data}
          questionario={questionario.data}
          respostas={respostas.data}
        />
      )}
    </div>
  )
}

function BriefingEnviado({
  projeto,
  questionario,
  respostas,
}: {
  projeto: Projeto
  questionario: Questionario
  respostas: Resposta[]
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-success/15 blur-3xl" aria-hidden />
        <CheckCircle2Icon className="size-8 text-success" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{projeto.nome}</h1>
        <p className="mt-1 text-muted-foreground">
          Briefing enviado em {formatarDataHora(projeto.enviado_em)}. Para alterar, peça a reabertura a um
          administrador.
        </p>
      </div>
      <ResumoRespostas questionario={questionario} respostas={indexarRespostas(respostas)} />
    </div>
  )
}

function Questionario({
  projeto,
  questionario,
  respostas,
}: {
  projeto: Projeto
  questionario: Questionario
  respostas: Resposta[]
}) {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const { secoes, ativas, numero } = questionario
  const etapaRevisao = secoes.length
  const etapa = Math.min(Math.max(Number(params.get('etapa')) || 0, 0), etapaRevisao)

  const porId = indexarRespostas(respostas)
  const tratadas = contarTratadas(ativas, porId)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [etapa])

  function irPara(nova: number) {
    setParams(nova === 0 ? {} : { etapa: String(nova) })
  }

  // Atualiza o cache na hora para o progresso refletir o que está na tela
  const onAlterar = useCallback(
    (r: RascunhoResposta) => {
      queryClient.setQueryData<Resposta[]>(chaves.respostas(projeto.id), (antigas = []) => {
        const nova: Resposta = {
          projeto_id: projeto.id,
          question_id: r.questionId,
          value: r.valor as Resposta['value'],
          skipped: r.skipped,
          updated_at: new Date().toISOString(),
        }
        return [...antigas.filter((a) => a.question_id !== r.questionId), nova]
      })
    },
    [queryClient, projeto.id],
  )

  const salvar = useCallback(
    async (r: RascunhoResposta) => {
      await salvarResposta(projeto.id, r)
      // A primeira resposta muda o status no banco (trigger)
      const atual = queryClient.getQueryData<Projeto>(chaves.projeto(projeto.id))
      if (atual?.status === 'nao_iniciado') {
        void queryClient.invalidateQueries({ queryKey: chaves.projeto(projeto.id) })
        void queryClient.invalidateQueries({ queryKey: ['projetos'] })
      }
    },
    [queryClient, projeto.id],
  )

  if (secoes.length === 0) {
    return (
      <Alert>
        <CircleAlertIcon />
        <AlertTitle>Questionário sem perguntas cadastradas</AlertTitle>
      </Alert>
    )
  }

  const secao = secoes[etapa]

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_1fr] lg:items-start">
      <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">Briefing</p>
          <h1 className="mt-1 text-2xl leading-tight font-semibold tracking-tight">{projeto.nome}</h1>
          <div className="mt-2">
            <StatusBriefing status={projeto.status} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <BarraProgresso feitas={tratadas} total={ativas.length} />
          <p className="text-xs text-muted-foreground">Salvamento automático</p>
        </div>

        <nav aria-label="Seções" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <ol className="flex gap-1.5 lg:flex-col">
            {secoes.map((s, i) => {
              const completa = s.perguntas.every((p) => perguntaTratada(porId.get(p.id)))
              return (
                <li key={s.id}>
                  <EtapaBotao
                    ativa={i === etapa}
                    completa={completa}
                    onClick={() => irPara(i)}
                    rotulo={s.titulo}
                    indice={i + 1}
                  />
                </li>
              )
            })}
            <li>
              <EtapaBotao
                ativa={etapa === etapaRevisao}
                completa={false}
                onClick={() => irPara(etapaRevisao)}
                rotulo="Revisar e enviar"
                icone={<SendIcon className="size-3.5" />}
              />
            </li>
          </ol>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col gap-5">
        {secao ? (
          <Card>
            <CardHeader>
              <p className="font-mono text-xs text-muted-foreground">
                Seção {String(etapa + 1).padStart(2, '0')} / {String(secoes.length).padStart(2, '0')}
              </p>
              <CardTitle className="text-xl">{secao.titulo}</CardTitle>
              {secao.descricao && <CardDescription>{secao.descricao}</CardDescription>}
            </CardHeader>
            <CardContent className="flex flex-col gap-8">
              {secao.perguntas.map((p) => (
                <QuestionField
                  key={p.id}
                  pergunta={p}
                  numero={numero.get(p.id) ?? 0}
                  resposta={porId.get(p.id)}
                  salvar={salvar}
                  onAlterar={onAlterar}
                />
              ))}
            </CardContent>
          </Card>
        ) : (
          <Revisao projeto={projeto} questionario={questionario} porId={porId} irPara={irPara} />
        )}

        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={() => irPara(etapa - 1)} className={cn(etapa === 0 && 'invisible')}>
            <ArrowLeftIcon />
            Anterior
          </Button>
          {etapa < etapaRevisao && (
            <Button onClick={() => irPara(etapa + 1)}>
              {etapa === etapaRevisao - 1 ? 'Revisar e enviar' : 'Próxima'}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function EtapaBotao({
  ativa,
  completa,
  onClick,
  rotulo,
  indice,
  icone,
}: {
  ativa: boolean
  completa: boolean
  onClick: () => void
  rotulo: string
  indice?: number
  icone?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativa ? 'step' : undefined}
      className={cn(
        'flex w-full shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm whitespace-nowrap transition-colors lg:whitespace-normal',
        ativa
          ? 'border-primary/50 bg-accent font-medium text-foreground shadow-[0_0_0_1px] shadow-primary/30'
          : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full font-mono text-[0.65rem]',
          completa ? 'bg-success text-success-foreground' : ativa ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        {completa ? <CheckCircle2Icon className="size-3.5" /> : (icone ?? indice ?? <CircleIcon />)}
      </span>
      {rotulo}
    </button>
  )
}

function Revisao({
  projeto,
  questionario,
  porId,
  irPara,
}: {
  projeto: Projeto
  questionario: Questionario
  porId: Map<string, Resposta>
  irPara: (etapa: number) => void
}) {
  const queryClient = useQueryClient()

  const faltando = questionario.secoes.flatMap((s, i) =>
    s.perguntas
      .filter((p) => p.obrigatoria && !perguntaTratada(porId.get(p.id)))
      .map((p) => ({ pergunta: p, etapa: i })),
  )
  const naReuniao = [...porId.values()].filter((r) => r.skipped && questionario.numero.has(r.question_id)).length

  const envio = useMutation({
    mutationFn: () => enviarBriefing(projeto.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chaves.projeto(projeto.id) }),
        queryClient.invalidateQueries({ queryKey: ['projetos'] }),
      ])
      toast.success('Briefing enviado')
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Revisar e enviar</CardTitle>
        <CardDescription>Depois de enviado, o briefing só pode ser alterado se um administrador reabrir.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {faltando.length > 0 ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Faltam {faltando.length} pergunta(s) obrigatória(s)</AlertTitle>
            <AlertDescription>
              <p>Responda ou marque "Tratar na reunião":</p>
              <ul className="mt-1 list-disc pl-5">
                {faltando.map(({ pergunta, etapa }) => (
                  <li key={pergunta.id}>
                    <button
                      type="button"
                      className="text-left underline underline-offset-2"
                      onClick={() => irPara(etapa)}
                    >
                      {questionario.numero.get(pergunta.id)}. {pergunta.titulo}
                    </button>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle2Icon className="text-success" />
            <AlertTitle>Tudo certo para enviar</AlertTitle>
            <AlertDescription>
              {naReuniao > 0
                ? `${naReuniao} ponto(s) marcados para tratar na reunião.`
                : 'Todas as perguntas obrigatórias foram respondidas.'}
            </AlertDescription>
          </Alert>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="lg" className="self-end" disabled={faltando.length > 0 || envio.isPending}>
              {envio.isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              Enviar briefing
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enviar o briefing de {projeto.nome}?</AlertDialogTitle>
              <AlertDialogDescription>
                As respostas ficam bloqueadas para edição até um administrador reabrir o briefing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={() => envio.mutate()}>Enviar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
