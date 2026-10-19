import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, ArrowRightIcon, CircleAlertIcon, FolderKanbanIcon, PlusIcon } from 'lucide-react'
import { BarraProgresso } from '@/components/BarraProgresso'
import { TituloPagina } from '@/components/Indicador'
import { StatusBriefing } from '@/components/StatusBriefing'
import { TelaCarregando } from '@/components/TelaCarregando'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { contarTratadas } from '@/data/respostas'
import { useQuestionario } from '@/features/questionario/useQuestionario'
import { formatarDataHora } from '@/lib/utils'
import { AcoesProjeto } from './AcoesProjeto'
import { AcoesUsuario } from './AcoesUsuario'
import { buscarCliente, chavesAdmin } from './api'
import { ProjetoDialog } from './ProjetoDialog'

export function ClienteDetalhePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const dados = useQuery({ queryKey: chavesAdmin.cliente(id), queryFn: () => buscarCliente(id) })
  const questionario = useQuestionario()

  if (dados.isPending || questionario.isPending) return <TelaCarregando />

  if (dados.isError || questionario.isError || !dados.data.cliente) {
    return (
      <div className="flex flex-col gap-4">
        <Voltar />
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{dados.data?.cliente === null ? 'Usuário não encontrado' : 'Erro ao carregar'}</AlertTitle>
          <AlertDescription>
            {(dados.error ?? questionario.error)?.message ?? 'Ele pode ter sido excluído.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const { cliente, projetos, respostas } = dados.data
  const total = questionario.data.ativas.length

  return (
    <div className="flex flex-col gap-8">
      <Voltar />

      <TituloPagina
        sobretitulo={cliente.matricula}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            {cliente.nome}
            {!cliente.ativo && <Badge variant="destructive">Inativo</Badge>}
            {cliente.ativo && cliente.senha_provisoria && <Badge variant="outline">Senha provisória</Badge>}
          </span>
        }
        acoes={
          <AcoesUsuario
            usuario={cliente}
            papel="cliente"
            onExcluido={() => navigate('/admin', { replace: true })}
          />
        }
      />

      <Card>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
            <Info rotulo="E-mail">{cliente.email}</Info>
            <Info rotulo="Setor">{cliente.empresa}</Info>
            <Info rotulo="Telefone">{cliente.telefone}</Info>
            <Info rotulo="Cadastrado em">{formatarDataHora(cliente.created_at)}</Info>
            <Info rotulo="Projetos">{String(projetos.length)}</Info>
          </dl>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Projetos</h2>
          <ProjetoDialog
            clienteId={cliente.id}
            gatilho={
              <Button>
                <PlusIcon />
                Novo projeto
              </Button>
            }
          />
        </div>

        {projetos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center">
            <FolderKanbanIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">Nenhum projeto</p>
            <p className="text-sm text-muted-foreground">Crie um projeto para liberar o briefing.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projetos.map((p) => (
              <Card key={p.id} className="transition-shadow hover:shadow-lg hover:shadow-primary/10">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{p.nome}</CardTitle>
                    <AcoesProjeto projeto={p} />
                  </div>
                  <div>
                    <StatusBriefing status={p.status} />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <BarraProgresso feitas={contarTratadas(questionario.data.ativas, respostas.get(p.id) ?? new Map())} total={total} />
                  <p className="text-xs text-muted-foreground">
                    {p.status === 'concluido'
                      ? `Enviado em ${formatarDataHora(p.enviado_em)}`
                      : `Atualizado em ${formatarDataHora(p.updated_at)}`}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/admin/projetos/${p.id}`}>
                      Ver respostas
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Voltar() {
  return (
    <Button variant="ghost" size="sm" asChild className="self-start print:hidden">
      <Link to="/admin">
        <ArrowLeftIcon />
        Usuários
      </Link>
    </Button>
  )
}

function Info({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium">{children || '—'}</dd>
    </div>
  )
}
