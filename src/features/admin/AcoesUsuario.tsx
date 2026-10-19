import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  EllipsisVerticalIcon,
  EyeIcon,
  KeyRoundIcon,
  LockOpenIcon,
  PencilIcon,
  PowerIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MIN_SENHA_PROVISORIA, SENHA_PADRAO } from '@/features/auth/matricula'
import {
  chavesAdmin,
  definirAtivo,
  excluirCliente,
  resetarSenha,
  type Credenciais,
  type Papel,
  type Perfil,
} from './api'
import { CredenciaisDialog } from './CredenciaisDialog'
import { EditarDadosDialog } from './EditarDadosDialog'

type Acao = 'resetar' | 'ativar' | 'excluir'

interface Props {
  usuario: Perfil
  papel: Papel
  /** Mostra "Ver projetos" (na lista) */
  comLinkDetalhe?: boolean
  onExcluido?: () => void
}

/** Menu de ações de um usuário ou de outro admin (editar, redefinir senha, ativar/desativar, excluir). */
export function AcoesUsuario({ usuario, papel, comLinkDetalhe, onExcluido }: Props) {
  const queryClient = useQueryClient()
  const [confirmar, setConfirmar] = useState<Acao | null>(null)
  const [credenciais, setCredenciais] = useState<Credenciais | null>(null)
  const [novaSenha, setNovaSenha] = useState(SENHA_PADRAO)
  const [editar, setEditar] = useState(false)
  const novaSenhaValida = novaSenha.length >= MIN_SENHA_PROVISORIA

  const atualizar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: chavesAdmin.clientes }),
      queryClient.invalidateQueries({ queryKey: chavesAdmin.admins }),
      queryClient.invalidateQueries({ queryKey: chavesAdmin.cliente(usuario.id) }),
    ])

  const acao = useMutation({
    mutationFn: async (a: Acao) => {
      switch (a) {
        case 'resetar':
          setCredenciais(await resetarSenha(usuario.id, novaSenha))
          return 'Senha redefinida'
        case 'ativar':
          await definirAtivo(usuario.id, !usuario.ativo)
          return usuario.ativo ? 'Acesso desativado' : 'Acesso reativado'
        case 'excluir':
          await excluirCliente(usuario.id)
          return 'Usuário excluído'
      }
    },
    onSuccess: async (mensagem, a) => {
      setConfirmar(null)
      toast.success(mensagem)
      if (a === 'excluir') {
        queryClient.removeQueries({ queryKey: chavesAdmin.cliente(usuario.id) })
        onExcluido?.()
      }
      await atualizar()
    },
    onError: (e) => {
      setConfirmar(null)
      toast.error(e.message)
    },
  })

  const textos: Record<Acao, { titulo: string; descricao: string; botao: string }> = {
    resetar: {
      titulo: 'Redefinir a senha?',
      descricao: `A senha atual de ${usuario.nome} deixa de funcionar. Com a senha abaixo, a pessoa entra e precisa criar uma nova.`,
      botao: 'Redefinir senha',
    },
    ativar: usuario.ativo
      ? {
          titulo: 'Desativar o acesso?',
          descricao: `${usuario.nome} não conseguirá mais entrar. Os dados são mantidos.`,
          botao: 'Desativar',
        }
      : {
          titulo: 'Reativar o acesso?',
          descricao: `${usuario.nome} poderá entrar de novo com a mesma senha.`,
          botao: 'Reativar',
        },
    excluir: {
      titulo: 'Excluir o usuário?',
      descricao: `Isto apaga ${usuario.nome} (${usuario.matricula}), TODOS os projetos e TODAS as respostas. Não dá para desfazer.`,
      botao: 'Excluir definitivamente',
    },
  }

  const atual = confirmar ? textos[confirmar] : null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${usuario.nome}`}>
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {comLinkDetalhe && (
            <>
              <DropdownMenuItem asChild>
                <Link to={`/admin/usuarios/${usuario.id}`}>
                  <EyeIcon />
                  Ver projetos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={() => setEditar(true)}>
            <PencilIcon />
            Editar dados
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setNovaSenha(SENHA_PADRAO)
              setConfirmar('resetar')
            }}
          >
            <KeyRoundIcon />
            Redefinir senha
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmar('ativar')}>
            {usuario.ativo ? <PowerIcon /> : <LockOpenIcon />}
            {usuario.ativo ? 'Desativar acesso' : 'Reativar acesso'}
          </DropdownMenuItem>
          {papel === 'cliente' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmar('excluir')}>
                <Trash2Icon />
                Excluir usuário
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmar !== null} onOpenChange={(a) => !a && !acao.isPending && setConfirmar(null)}>
        <AlertDialogContent>
          {atual && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{atual.titulo}</AlertDialogTitle>
                <AlertDialogDescription>{atual.descricao}</AlertDialogDescription>
              </AlertDialogHeader>
              {confirmar === 'resetar' && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`senha-${usuario.id}`}>Senha provisória</Label>
                  <Input
                    id={`senha-${usuario.id}`}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono"
                    aria-invalid={!novaSenhaValida}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo de {MIN_SENHA_PROVISORIA} caracteres.</p>
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={acao.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant={confirmar === 'excluir' ? 'destructive' : 'default'}
                  disabled={acao.isPending || (confirmar === 'resetar' && !novaSenhaValida)}
                  onClick={(e) => {
                    e.preventDefault() // mantém aberto até terminar
                    if (confirmar) acao.mutate(confirmar)
                  }}
                >
                  {atual.botao}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <EditarDadosDialog usuario={usuario} papel={papel} aberto={editar} onAbertoChange={setEditar} />

      <CredenciaisDialog
        credenciais={credenciais && { ...credenciais, nome: usuario.nome }}
        titulo="Nova senha provisória"
        onClose={() => setCredenciais(null)}
      />
    </>
  )
}
