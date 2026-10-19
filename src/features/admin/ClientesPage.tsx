import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  FolderKanbanIcon,
  KeyRoundIcon,
  SearchIcon,
  SendIcon,
  TimerIcon,
  UsersIcon,
} from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { BarraProgresso } from '@/components/BarraProgresso'
import { Indicador, TituloPagina } from '@/components/Indicador'
import { StatusBriefing } from '@/components/StatusBriefing'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { progressoDoProjeto, statusDoProjeto } from '@/data/status'
import { useCatalogo } from '@/features/questionario/useCatalogo'
import { cn, formatarDataHora } from '@/lib/utils'
import { AcoesUsuario } from './AcoesUsuario'
import { chavesAdmin, listarClientes, type ClienteComProjetos } from './api'
import { NovoUsuarioDialog } from './NovoUsuarioDialog'

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function combina(c: ClienteComProjetos, busca: string) {
  const alvo = normalizar([c.matricula, c.nome, c.empresa, c.email, ...c.projetos.map((p) => p.nome)].filter(Boolean).join(' '))
  return alvo.includes(normalizar(busca.trim()))
}

export function ClientesPage() {
  const [busca, setBusca] = useState('')
  const navigate = useNavigate()
  const dados = useQuery({ queryKey: chavesAdmin.clientes, queryFn: listarClientes })
  const catalogo = useCatalogo()

  const clientes = dados.data?.clientes ?? []
  const projetos = clientes.flatMap((c) => c.projetos)
  const lista = clientes.filter((c) => combina(c, busca))

  return (
    <div className="flex flex-col gap-8">
      <TituloPagina
        sobretitulo="Painel"
        titulo="Usuários"
        acoes={<NovoUsuarioDialog papel="cliente" />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Usuários" valor={clientes.length} icone={<UsersIcon />} />
        <Indicador rotulo="Projetos" valor={projetos.length} icone={<FolderKanbanIcon />} />
        <Indicador
          rotulo="Em andamento"
          valor={projetos.filter((p) => statusDoProjeto(p.anexos) === 'em_andamento').length}
          icone={<TimerIcon />}
          destaque="primario"
        />
        <Indicador
          rotulo="Enviados"
          valor={projetos.filter((p) => statusDoProjeto(p.anexos) === 'concluido').length}
          icone={<SendIcon />}
          destaque="sucesso"
        />
      </div>

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, setor, projeto ou matrícula"
          aria-label="Buscar usuários"
          className="h-9 pl-8"
        />
      </div>

      {dados.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : dados.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Não foi possível carregar os usuários</AlertTitle>
          <AlertDescription>{dados.error.message}</AlertDescription>
        </Alert>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-12 text-center">
          <UsersIcon className="size-8 text-muted-foreground" />
          <p className="font-medium">Nenhum usuário cadastrado</p>
          <p className="text-sm text-muted-foreground">
            Use "Novo usuário" para cadastrar.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[38%]">Usuário</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead className="w-32">Cadastro</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c) => {
                const [data, hora] = formatarDataHora(c.created_at).split(', ')
                return (
                  <TableRow
                    key={c.id}
                    // A linha inteira abre o usuário; links e o menu de ações param o clique
                    onClick={() => navigate(`/admin/usuarios/${c.id}`)}
                    className={cn('group cursor-pointer', !c.ativo && 'opacity-60')}
                  >
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar nome={c.nome} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/admin/usuarios/${c.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium group-hover:text-primary"
                            >
                              {c.nome}
                            </Link>
                            <span className="rounded-md border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground">
                              {c.matricula}
                            </span>
                            {!c.ativo && <Badge variant="destructive">Inativo</Badge>}
                            {c.ativo && c.senha_provisoria && (
                              <Badge variant="outline" className="gap-1 text-muted-foreground">
                                <KeyRoundIcon />
                                Senha provisória
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            {c.empresa && <span className="font-medium text-foreground/80">{c.empresa}</span>}
                            {c.empresa && c.email && <span aria-hidden>·</span>}
                            {c.email && <span className="truncate">{c.email}</span>}
                            {!c.empresa && !c.email && <span>—</span>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      {c.projetos.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Nenhum projeto</span>
                      ) : (
                        <ul className="flex flex-col gap-2.5">
                          {c.projetos.map((p) => {
                            const { feitas, total } = progressoDoProjeto(
                              p,
                              catalogo.data,
                              dados.data.respostas.get(p.id) ?? new Map(),
                            )
                            return (
                              <li key={p.id} className="flex flex-col gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    to={`/admin/projetos/${p.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sm font-medium hover:text-primary hover:underline"
                                  >
                                    {p.nome}
                                  </Link>
                                  <StatusBriefing status={statusDoProjeto(p.anexos)} />
                                </div>
                                <BarraProgresso feitas={feitas} total={total} className="max-w-56" />
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 text-xs">
                      <div>{data}</div>
                      <div className="text-muted-foreground">{hora}</div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div onClick={(e) => e.stopPropagation()}>
                        <AcoesUsuario usuario={c} papel="cliente" comLinkDetalhe />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {lista.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado para "{busca}".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
