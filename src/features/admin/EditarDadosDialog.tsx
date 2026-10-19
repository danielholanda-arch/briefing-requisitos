import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { chavePerfil } from '@/features/auth/api'
import { FORMATO_EMAIL } from '@/features/auth/matricula'
import { atualizarDados, chavesAdmin, type DadosUsuario, type Papel, type Perfil } from './api'

function dadosDe(u: Perfil): DadosUsuario {
  return { nome: u.nome, email: u.email ?? '', telefone: u.telefone ?? '', empresa: u.empresa ?? '' }
}

/** Nome, e-mail, telefone e setor. Matrícula e papel não mudam por aqui. */
export function EditarDadosDialog({
  usuario,
  papel,
  aberto,
  onAbertoChange,
}: {
  usuario: Perfil
  papel: Papel
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [dados, setDados] = useState(() => dadosDe(usuario))
  const [abertoAntes, setAbertoAntes] = useState(aberto)
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto)
    if (aberto) setDados(dadosDe(usuario))
  }

  const emailValido = dados.email.trim() === '' || FORMATO_EMAIL.test(dados.email.trim())
  const podeSalvar = dados.nome.trim() !== '' && emailValido

  const salvar = useMutation({
    mutationFn: () => atualizarDados(usuario.id, dados),
    onSuccess: async () => {
      toast.success('Dados atualizados')
      onAbertoChange(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chavesAdmin.clientes }),
        queryClient.invalidateQueries({ queryKey: chavesAdmin.admins }),
        queryClient.invalidateQueries({ queryKey: chavesAdmin.cliente(usuario.id) }),
        queryClient.invalidateQueries({ queryKey: chavePerfil(usuario.id) }),
      ])
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (podeSalvar) salvar.mutate()
  }

  const campo = (chave: keyof DadosUsuario) => ({
    id: `editar-${chave}`,
    value: dados[chave],
    onChange: (e: { target: { value: string } }) => setDados((d) => ({ ...d, [chave]: e.target.value })),
  })

  return (
    <Dialog open={aberto} onOpenChange={(a) => !salvar.isPending && onAbertoChange(a)}>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Editar dados</DialogTitle>
            <DialogDescription className="font-mono">{usuario.matricula}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="editar-nome">Nome *</Label>
            <Input {...campo('nome')} required autoComplete="off" autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="editar-email">E-mail</Label>
              <Input {...campo('email')} type="email" autoComplete="off" spellCheck={false} aria-invalid={!emailValido} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="editar-telefone">Telefone</Label>
              <Input {...campo('telefone')} type="tel" autoComplete="off" />
            </div>
          </div>
          {papel === 'cliente' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="editar-empresa">Setor</Label>
              <Input {...campo('empresa')} autoComplete="off" />
            </div>
          )}
          {salvar.error && (
            <Alert variant="destructive">
              <AlertDescription>{salvar.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onAbertoChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending || !podeSalvar}>
              {salvar.isPending && <Loader2Icon className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
