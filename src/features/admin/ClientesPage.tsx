import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  FolderKanbanIcon,
  SearchIcon,
  SendIcon,
  TimerIcon,
  UsersIcon,
} from 'lucide-react'
import { Indicador, TituloPagina } from '@/components/Indicador'
import { StatusBriefing } from '@/components/StatusBriefing'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { progressoDoProjeto, statusDoProjeto } from '@/data/status'
import { useCatalogo } from '@/features/questionario/useCatalogo'
import { formatarDataHora } from '@/lib/utils'
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
                <TableHead>Matrícula</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c) => (
                <TableRow key={c.id} className={c.ativo ? undefined : 'opacity-60'}>
                  <TableCell className="align-top font-mono text-xs">{c.matricula}</TableCell>
                  <TableCell className="align-top">
                    <Link to={`/admin/usuarios/${c.id}`} className="font-medium hover:text-primary hover:underline">
                      {c.nome}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {[c.empresa, c.email].filter(Boolean).join(' · ') || '—'}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {!c.ativo && <Badge variant="destructive">Inativo</Badge>}
                      {c.ativo && c.senha_provisoria && <Badge variant="outline">Senha provisória</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    {c.projetos.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Nenhum projeto</span>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {c.projetos.map((p) => {
                          const { feitas, total } = progressoDoProjeto(
                            p,
                            catalogo.data,
                            dados.data.respostas.get(p.id) ?? new Map(),
                          )
                          return (
                            <li key={p.id} className="flex flex-wrap items-center gap-2">
                              <Link to={`/admin/projetos/${p.id}`} className="text-sm hover:text-primary hover:underline">
                                {p.nome}
                              </Link>
                              <StatusBriefing status={statusDoProjeto(p.anexos)} />
                              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                                {feitas}/{total}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-xs text-muted-foreground">
                    {formatarDataHora(c.created_at)}
                  </TableCell>
                  <TableCell className="align-top">
                    <AcoesUsuario usuario={c} papel="cliente" comLinkDetalhe />
                  </TableCell>
                </TableRow>
              ))}
              {lista.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
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
