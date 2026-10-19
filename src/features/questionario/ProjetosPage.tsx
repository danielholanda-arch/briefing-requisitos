import { Link, Navigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon, CircleAlertIcon, FolderKanbanIcon } from 'lucide-react'
import { BarraProgresso } from '@/components/BarraProgresso'
import { StatusBriefing } from '@/components/StatusBriefing'
import { TelaCarregando } from '@/components/TelaCarregando'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { agruparPorProjeto, contarTratadas } from '@/data/respostas'
import { statusDoProjeto } from '@/data/status'
import { useAuth } from '@/features/auth/useAuth'
import { formatarDataHora } from '@/lib/utils'
import { buscarMeusProjetos, buscarRespostasDosProjetos, chaves } from './api'
import { useCatalogo } from './useCatalogo'

/** Projetos do usuário, cada um com os questionários anexados. Com um só questionário, vai direto. */
export function ProjetosPage() {
  const { user } = useAuth()
  const userId = user!.id

  const catalogo = useCatalogo()
  const projetos = useQuery({
    queryKey: chaves.meusProjetos(userId),
    queryFn: () => buscarMeusProjetos(userId),
  })
  const ids = projetos.data?.map((p) => p.id) ?? []
  const respostas = useQuery({
    queryKey: ['respostas', 'projetos', ...ids],
    queryFn: () => buscarRespostasDosProjetos(ids),
    enabled: projetos.isSuccess && ids.length > 0,
  })

  if (projetos.isPending || catalogo.isPending) return <TelaCarregando />

  if (projetos.isError || catalogo.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Não foi possível carregar os projetos</AlertTitle>
        <AlertDescription>Recarregue a página.</AlertDescription>
      </Alert>
    )
  }

  const anexos = projetos.data.flatMap((p) => p.anexos.map((a) => ({ projeto: p, anexo: a })))
  if (projetos.data.length === 1 && anexos.length === 1) {
    const { projeto, anexo } = anexos[0]
    return <Navigate to={`/questionario/${projeto.id}/${anexo.questionario_id}`} replace />
  }

  const porProjeto = agruparPorProjeto(respostas.data ?? [])

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight">Projetos</h1>

      {projetos.data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-12 text-center">
          <FolderKanbanIcon className="size-8 text-muted-foreground" />
          <p className="font-medium">Nenhum projeto cadastrado</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projetos.data.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg leading-snug">{p.nome}</CardTitle>
                  <StatusBriefing status={statusDoProjeto(p.anexos)} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {p.anexos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum questionário liberado.</p>
                )}
                {p.anexos.map((a) => {
                  const q = catalogo.data.porId.get(a.questionario_id)
                  if (!q) return null
                  const feitas = contarTratadas(q.ativas, porProjeto.get(p.id) ?? new Map())
                  return (
                    <div
                      key={a.questionario_id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-background/50 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{q.info.nome}</span>
                          <StatusBriefing status={a.status} />
                        </div>
                        <BarraProgresso feitas={feitas} total={q.ativas.length} className="mt-2 max-w-64" />
                        {a.status === 'concluido' && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Enviado em {formatarDataHora(a.enviado_em)}
                          </p>
                        )}
                      </div>
                      <Button asChild size="sm" variant={a.status === 'concluido' ? 'outline' : 'default'}>
                        <Link to={`/questionario/${p.id}/${a.questionario_id}`}>
                          {a.status === 'concluido'
                            ? 'Ver respostas'
                            : a.status === 'em_andamento'
                              ? 'Continuar'
                              : 'Responder'}
                          <ArrowRightIcon data-icon="inline-end" />
                        </Link>
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
