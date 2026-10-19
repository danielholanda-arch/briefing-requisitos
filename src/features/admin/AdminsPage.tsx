import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CircleAlertIcon, PencilIcon, ShieldCheckIcon } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { TituloPagina } from '@/components/Indicador'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/useAuth'
import { cn, formatarDataHora } from '@/lib/utils'
import { AcoesUsuario } from './AcoesUsuario'
import { chavesAdmin, listarAdmins, type Perfil } from './api'
import { EditarDadosDialog } from './EditarDadosDialog'
import { NovoUsuarioDialog } from './NovoUsuarioDialog'

export function AdminsPage() {
  const { user } = useAuth()
  const admins = useQuery({ queryKey: chavesAdmin.admins, queryFn: listarAdmins })
  const [editarProprio, setEditarProprio] = useState<Perfil | null>(null)

  return (
    <div className="flex flex-col gap-8">
      <TituloPagina
        sobretitulo="Equipe"
        titulo="Administradores"
        descricao="Cadastram usuários, editam perguntas e leem os briefings."
        acoes={<NovoUsuarioDialog papel="admin" />}
      />

      {admins.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : admins.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Não foi possível carregar os administradores</AlertTitle>
          <AlertDescription>{admins.error.message}</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Celular: um cartão por admin */}
          <ul className="flex flex-col gap-3 md:hidden">
            {admins.data.map((a) => {
              const voce = a.id === user?.id
              return (
                <li
                  key={a.id}
                  className={cn('flex items-start gap-3 rounded-xl border bg-card p-4', !a.ativo && 'opacity-60')}
                >
                  <Avatar nome={a.nome} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.nome}</span>
                      {voce && <Badge variant="secondary">Você</Badge>}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">{a.matricula}</div>
                    {a.email && (
                      <div className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{a.email}</div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Situacao admin={a} />
                      <span className="text-xs text-muted-foreground">desde {formatarDataHora(a.created_at)}</span>
                    </div>
                  </div>
                  <AcoesAdmin admin={a} voce={voce} onEditarProprio={() => setEditarProprio(a)} />
                </li>
              )
            })}
          </ul>

          {/* Computador: tabela */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Matrícula</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.data.map((a) => {
                const voce = a.id === user?.id
                return (
                  <TableRow key={a.id} className={a.ativo ? undefined : 'opacity-60'}>
                    <TableCell className="font-mono text-xs">{a.matricula}</TableCell>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <ShieldCheckIcon className="size-4 text-primary" />
                        {a.nome}
                        {voce && <Badge variant="secondary">Você</Badge>}
                      </span>
                      {a.email && <span className="block text-xs font-normal text-muted-foreground">{a.email}</span>}
                    </TableCell>
                    <TableCell>
                      <Situacao admin={a} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatarDataHora(a.created_at)}</TableCell>
                    <TableCell>
                      <AcoesAdmin admin={a} voce={voce} onEditarProprio={() => setEditarProprio(a)} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </>
      )}
      {editarProprio && (
        <EditarDadosDialog
          usuario={editarProprio}
          papel="admin"
          aberto
          onAbertoChange={(a) => !a && setEditarProprio(null)}
        />
      )}
      <p className="text-sm text-muted-foreground">
        A própria conta não pode ser desativada nem ter a senha redefinida por aqui. Admins não são
        excluídos, apenas desativados.
      </p>
    </div>
  )
}

function Situacao({ admin: a }: { admin: Perfil }) {
  if (!a.ativo) return <Badge variant="destructive">Inativo</Badge>
  if (a.senha_provisoria) return <Badge variant="outline">Senha provisória</Badge>
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className="size-1.5 rounded-full bg-success" aria-hidden />
      Ativo
    </Badge>
  )
}

/** Na própria conta só dá para editar os dados; nos outros admins, o menu completo. */
function AcoesAdmin({ admin, voce, onEditarProprio }: { admin: Perfil; voce: boolean; onEditarProprio: () => void }) {
  if (!voce) return <AcoesUsuario usuario={admin} papel="admin" />
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Editar meus dados"
      title="Editar meus dados"
      onClick={onEditarProprio}
    >
      <PencilIcon />
    </Button>
  )
}
