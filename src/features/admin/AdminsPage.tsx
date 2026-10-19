import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CircleAlertIcon, PencilIcon, ShieldCheckIcon } from 'lucide-react'
import { TituloPagina } from '@/components/Indicador'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/useAuth'
import { formatarDataHora } from '@/lib/utils'
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
        <div className="overflow-hidden rounded-xl border bg-card">
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
                      {!a.ativo ? (
                        <Badge variant="destructive">Inativo</Badge>
                      ) : a.senha_provisoria ? (
                        <Badge variant="outline">Senha provisória</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5">
                          <span className="size-1.5 rounded-full bg-success" aria-hidden />
                          Ativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatarDataHora(a.created_at)}</TableCell>
                    <TableCell>
                      {voce ? (
                        <Button variant="ghost" size="icon-sm" aria-label="Editar meus dados" title="Editar meus dados" onClick={() => setEditarProprio(a)}>
                          <PencilIcon />
                        </Button>
                      ) : (
                        <AcoesUsuario usuario={a} papel="admin" />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
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
