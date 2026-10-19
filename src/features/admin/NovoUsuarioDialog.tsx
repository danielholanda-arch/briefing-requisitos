import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon, PlusIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FORMATO_EMAIL,
  FORMATO_MATRICULA,
  MIN_SENHA_PROVISORIA,
  normalizarMatricula,
  SENHA_PADRAO,
} from '@/features/auth/matricula'
import { chavesAdmin, criarUsuario, type Credenciais, type NovoUsuario, type Papel } from './api'
import { CredenciaisDialog } from './CredenciaisDialog'

type Formulario = Required<Omit<NovoUsuario, 'papel'>>

const vazio: Formulario = {
  matricula: '',
  senha: SENHA_PADRAO,
  nome: '',
  email: '',
  empresa: '',
  telefone: '',
  projeto: '',
}

/** Cadastro de usuário (com o primeiro projeto) ou de administrador. */
export function NovoUsuarioDialog({ papel }: { papel: Papel }) {
  const ehUsuario = papel === 'cliente'
  const queryClient = useQueryClient()
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState(vazio)
  const [criado, setCriado] = useState<(Credenciais & { nome: string }) | null>(null)

  const matriculaValida = FORMATO_MATRICULA.test(form.matricula)
  const senhaValida = form.senha.length >= MIN_SENHA_PROVISORIA
  const emailValido = form.email.trim() === '' || FORMATO_EMAIL.test(form.email.trim())
  const podeEnviar = matriculaValida && senhaValida && emailValido && form.nome.trim() !== ''

  const criar = useMutation({
    mutationFn: () =>
      criarUsuario({
        papel,
        matricula: form.matricula,
        senha: form.senha,
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        empresa: ehUsuario ? form.empresa.trim() : '',
        telefone: form.telefone.trim(),
        projeto: ehUsuario ? form.projeto.trim() : '',
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ehUsuario ? chavesAdmin.clientes : chavesAdmin.admins })
      setCriado({ matricula: res.matricula, senha: res.senha, nome: form.nome.trim() })
      setAberto(false)
      setForm(vazio)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (podeEnviar) criar.mutate()
  }

  const campo = (chave: keyof Formulario) => ({
    id: `novo-${chave}`,
    value: form[chave],
    onChange: (e: { target: { value: string } }) =>
      setForm((f) => ({
        ...f,
        [chave]: chave === 'matricula' ? normalizarMatricula(e.target.value) : e.target.value,
      })),
  })

  return (
    <>
      <Dialog
        open={aberto}
        onOpenChange={(a) => {
          setAberto(a)
          if (!a) criar.reset()
        }}
      >
        <DialogTrigger asChild>
          <Button>
            <PlusIcon />
            {ehUsuario ? 'Novo usuário' : 'Novo admin'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{ehUsuario ? 'Novo usuário' : 'Novo administrador'}</DialogTitle>
              <DialogDescription>A senha inicial é trocada no primeiro acesso.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="novo-matricula">Matrícula *</Label>
                <Input
                  {...campo('matricula')}
                  placeholder="ex.: abcd1234"
                  required
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="font-mono"
                  aria-invalid={form.matricula !== '' && !matriculaValida}
                  aria-describedby="novo-matricula-ajuda"
                />
                <p id="novo-matricula-ajuda" className="text-xs text-muted-foreground">
                  Letras e números, 3 a 30 caracteres.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="novo-senha">Senha inicial *</Label>
                <Input
                  {...campo('senha')}
                  required
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                  aria-invalid={!senhaValida}
                  aria-describedby="novo-senha-ajuda"
                />
                <p id="novo-senha-ajuda" className="text-xs text-muted-foreground">
                  Mínimo de {MIN_SENHA_PROVISORIA} caracteres.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="novo-nome">Nome *</Label>
              <Input {...campo('nome')} required autoComplete="off" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="novo-email">E-mail</Label>
                <Input
                  {...campo('email')}
                  type="email"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!emailValido}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="novo-telefone">Telefone</Label>
                <Input {...campo('telefone')} type="tel" autoComplete="off" />
              </div>
            </div>
            {ehUsuario && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="novo-empresa">Setor</Label>
                  <Input {...campo('empresa')} autoComplete="off" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="novo-projeto">Primeiro projeto</Label>
                  <Input {...campo('projeto')} autoComplete="off" />
                </div>
              </div>
            )}
            {criar.error && (
              <Alert variant="destructive">
                <AlertDescription>{criar.error.message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criar.isPending || !podeEnviar}>
                {criar.isPending && <Loader2Icon className="animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CredenciaisDialog
        credenciais={criado}
        titulo={ehUsuario ? 'Usuário cadastrado' : 'Admin cadastrado'}
        onClose={() => setCriado(null)}
      />
    </>
  )
}
