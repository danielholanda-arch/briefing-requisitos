import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, CircleAlertIcon, PrinterIcon } from 'lucide-react'
import { BarraProgresso } from '@/components/BarraProgresso'
import { TituloPagina } from '@/components/Indicador'
import { ResumoRespostas } from '@/components/ResumoRespostas'
import { StatusBriefing } from '@/components/StatusBriefing'
import { TelaCarregando } from '@/components/TelaCarregando'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { contarTratadas, indexarRespostas } from '@/data/respostas'
import { useQuestionario } from '@/features/questionario/useQuestionario'
import { formatarDataHora } from '@/lib/utils'
import { AcoesProjeto } from './AcoesProjeto'
import { buscarProjetoComCliente, buscarRespostasDoProjeto, chavesAdmin } from './api'

export function ProjetoDetalhePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const projeto = useQuery({ queryKey: chavesAdmin.projeto(id), queryFn: () => buscarProjetoComCliente(id) })
  const respostas = useQuery({ queryKey: chavesAdmin.respostas(id), queryFn: () => buscarRespostasDoProjeto(id) })
  const questionario = useQuestionario()

  if (projeto.isPending || respostas.isPending || questionario.isPending) return <TelaCarregando />

  if (projeto.isError || respostas.isError || questionario.isError || !projeto.data) {
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
            {(projeto.error ?? respostas.error ?? questionario.error)?.message ?? 'Ele pode ter sido excluído.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const p = projeto.data
  const porId = indexarRespostas(respostas.data)
  const naReuniao = respostas.data.filter((r) => r.skipped).length

  return (
    <div className="flex flex-col gap-8">
      <Button variant="ghost" size="sm" asChild className="self-start print:hidden">
        <Link to={`/admin/usuarios/${p.cliente_id}`}>
          <ArrowLeftIcon />
          {p.cliente?.nome ?? 'Usuário'}
        </Link>
      </Button>

      <TituloPagina
        sobretitulo="Briefing do projeto"
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
                <StatusBriefing status={p.status} />
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Criado em</dt>
              <dd className="font-medium">{formatarDataHora(p.created_at)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Enviado em</dt>
              <dd className="font-medium">{formatarDataHora(p.enviado_em)}</dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground">Progresso</dt>
              <dd>
                <BarraProgresso feitas={contarTratadas(questionario.data.ativas, porId)} total={questionario.data.ativas.length} />
              </dd>
              {naReuniao > 0 && (
                <dd className="text-xs text-muted-foreground">{naReuniao} para tratar na reunião</dd>
              )}
            </div>
          </dl>
        </CardContent>
      </Card>

      <ResumoRespostas questionario={questionario.data} respostas={porId} />
    </div>
  )
}
