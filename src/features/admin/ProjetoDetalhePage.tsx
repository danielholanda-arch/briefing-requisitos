import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, CircleAlertIcon, ClipboardListIcon, PrinterIcon } from 'lucide-react'
import { BarraProgresso } from '@/components/BarraProgresso'
import { TituloPagina } from '@/components/Indicador'
import { ResumoRespostas } from '@/components/ResumoRespostas'
import { StatusBriefing } from '@/components/StatusBriefing'
import { TelaCarregando } from '@/components/TelaCarregando'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { contarTratadas, indexarRespostas } from '@/data/respostas'
import { statusDoProjeto, ultimoEnvio } from '@/data/status'
import { useCatalogo } from '@/features/questionario/useCatalogo'
import { formatarDataHora } from '@/lib/utils'
import { AcoesProjeto } from './AcoesProjeto'
import { AcoesAnexo, AnexarQuestionario } from './AnexosProjeto'
import { buscarProjetoComCliente, buscarRespostasDoProjeto, chavesAdmin } from './api'

export function ProjetoDetalhePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const projeto = useQuery({ queryKey: chavesAdmin.projeto(id), queryFn: () => buscarProjetoComCliente(id) })
  const respostas = useQuery({ queryKey: chavesAdmin.respostas(id), queryFn: () => buscarRespostasDoProjeto(id) })
  const catalogo = useCatalogo()

  if (projeto.isPending || respostas.isPending || catalogo.isPending) return <TelaCarregando />

  if (projeto.isError || respostas.isError || catalogo.isError || !projeto.data) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link to="/admin">
            <ArrowLeftIcon />
            Usuários
          </Link>
        </Button>
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{projeto.data === null ? 'Projeto não encontrado' : 'Erro ao carregar'}</AlertTitle>
          <AlertDescription>
            {(projeto.error ?? respostas.error ?? catalogo.error)?.message ?? 'Ele pode ter sido excluído.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const p = projeto.data
  const porId = indexarRespostas(respostas.data)

  return (
    <div className="flex flex-col gap-8">
      <Button variant="ghost" size="sm" asChild className="self-start print:hidden">
        <Link to={`/admin/usuarios/${p.cliente_id}`}>
          <ArrowLeftIcon />
          {p.cliente?.nome ?? 'Usuário'}
        </Link>
      </Button>

      <TituloPagina
        sobretitulo="Projeto"
        titulo={p.nome}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            {p.cliente?.nome}
            {p.cliente?.empresa && <span>· {p.cliente.empresa}</span>}
            <span className="font-mono text-xs">{p.cliente?.matricula}</span>
          </span>
        }
        acoes={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <PrinterIcon />
              Imprimir
            </Button>
            <AcoesProjeto projeto={p} onExcluido={() => navigate(`/admin/usuarios/${p.cliente_id}`, { replace: true })} />
          </>
        }
      />

      <Card>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBriefing status={statusDoProjeto(p.anexos)} />
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Criado em</dt>
              <dd className="font-medium">{formatarDataHora(p.created_at)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Último envio</dt>
              <dd className="font-medium">{formatarDataHora(ultimoEnvio(p.anexos))}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Questionários</dt>
              <dd className="font-medium">{p.anexos.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Questionários do projeto</h2>
          <AnexarQuestionario projeto={p} catalogo={catalogo.data} />
        </div>

        {p.anexos.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center">
            <ClipboardListIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">Nenhum questionário anexado</p>
          </div>
        )}

        {p.anexos.map((a) => {
          const q = catalogo.data.porId.get(a.questionario_id)
          if (!q) return null
          const idsDoQuestionario = new Set(q.porId.keys())
          const respostasDoQuestionario = respostas.data.filter((r) => idsDoQuestionario.has(r.question_id))
          const naReuniao = respostasDoQuestionario.filter((r) => r.skipped).length
          return (
            <div key={a.questionario_id} className="flex flex-col gap-3">
              <Card>
                <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="min-w-48 flex-1">
                    <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">Questionário</p>
                    <h3 className="text-lg font-semibold">{q.info.nome}</h3>
                  </div>
                  <StatusBriefing status={a.status} />
                  <div className="w-48">
                    <BarraProgresso feitas={contarTratadas(q.ativas, porId)} total={q.ativas.length} />
                    {naReuniao > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">{naReuniao} para tratar na reunião</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.status === 'concluido' ? `Enviado em ${formatarDataHora(a.enviado_em)}` : 'Não enviado'}
                  </p>
                  <AcoesAnexo
                    projeto={p}
                    anexo={a}
                    questionario={q}
                    temRespostas={respostasDoQuestionario.length > 0}
                  />
                </CardContent>
              </Card>
              <ResumoRespostas questionario={q} respostas={porId} />
            </div>
          )
        })}
      </section>
    </div>
  )
}
