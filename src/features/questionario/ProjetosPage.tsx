import { Link, Navigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon, CircleAlertIcon, FolderKanbanIcon } from 'lucide-react'
import { BarraProgresso } from '@/components/BarraProgresso'
import { StatusBriefing } from '@/components/StatusBriefing'
import { TelaCarregando } from '@/components/TelaCarregando'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { agruparPorProjeto, contarTratadas } from '@/data/respostas'
import { buscarMeuPerfil, chavePerfil } from '@/features/auth/api'
import { useAuth } from '@/features/auth/useAuth'
import { formatarDataHora } from '@/lib/utils'
import { buscarMeusProjetos, buscarRespostasDosProjetos, chaves } from './api'
import { useQuestionario } from './useQuestionario'

/** "Meus projetos": um cartão por projeto. Com um projeto só, vai direto para ele. */
export function ProjetosPage() {
  const { user } = useAuth()
  const userId = user!.id

  const perfil = useQuery({ queryKey: chavePerfil(userId), queryFn: () => buscarMeuPerfil(userId) })
  const questionario = useQuestionario()
  const projetos = useQuery({
    queryKey: chaves.meusProjetos(userId),
    queryFn: () => buscarMeusProjetos(userId),
  })
  const ids = projetos.data?.map((p) => p.id) ?? []
  const respostas = useQuery({
    queryKey: ['respostas', 'projetos', ...ids],
    queryFn: () => buscarRespostasDosProjetos(ids),
    enabled: projetos.isSuccess && ids.length > 1,
  })

  if (projetos.isPending || questionario.isPending || perfil.isPending) return <TelaCarregando />

  if (projetos.isError || questionario.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Não foi possível carregar seus projetos</AlertTitle>
        <AlertDescription>Verifique sua conexão e recarregue a página.</AlertDescription>
      </Alert>
    )
  }

  if (projetos.data.length === 1) {
    return <Navigate to={`/questionario/${projetos.data[0].id}`} replace />
  }

  const porProjeto = agruparPorProjeto(respostas.data ?? [])
  const total = questionario.data.ativas.length

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Projetos</h1>
      </div>

      {projetos.data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-12 text-center">
          <FolderKanbanIcon className="size-8 text-muted-foreground" />
          <p className="font-medium">Nenhum projeto cadastrado</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projetos.data.map((p) => {
            const feitas = contarTratadas(questionario.data.ativas, porProjeto.get(p.id) ?? new Map())
            return (
              <Card key={p.id} className="group transition-shadow hover:shadow-lg hover:shadow-primary/10">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-snug">{p.nome}</CardTitle>
                    <StatusBriefing status={p.status} />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <BarraProgresso feitas={feitas} total={total} />
                  <p className="text-xs text-muted-foreground">
                    {p.status === 'concluido'
                      ? `Enviado em ${formatarDataHora(p.enviado_em)}`
                      : `Atualizado em ${formatarDataHora(p.updated_at)}`}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant={p.status === 'concluido' ? 'outline' : 'default'} className="w-full">
                    <Link to={`/questionario/${p.id}`}>
                      {p.status === 'concluido'
                        ? 'Ver respostas'
                        : p.status === 'em_andamento'
                          ? 'Continuar'
                          : 'Começar'}
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
