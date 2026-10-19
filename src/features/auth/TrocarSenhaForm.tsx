import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRoundIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trocarMinhaSenha } from './api'
import { MIN_SENHA_PROPRIA, SENHA_PADRAO } from './matricula'

/** Primeiro acesso (ou depois de um reset): troca a senha provisória por uma própria. */
export function TrocarSenhaForm({ onTrocada }: { onTrocada: () => Promise<unknown> | void }) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [tentou, setTentou] = useState(false)

  const problema =
    senha.length < MIN_SENHA_PROPRIA
      ? `Use pelo menos ${MIN_SENHA_PROPRIA} caracteres.`
      : senha === SENHA_PADRAO
        ? 'Escolha uma senha diferente da senha padrão.'
        : senha !== confirmacao
          ? 'As duas senhas não são iguais.'
          : null

  const troca = useMutation({
    mutationFn: () => trocarMinhaSenha(senha),
    onSuccess: async () => {
      toast.success('Senha criada')
      await onTrocada()
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (!problema) troca.mutate()
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRoundIcon className="size-5" />
          Criar senha
        </CardTitle>
        <CardDescription>
          A senha atual é provisória. Defina uma senha própria para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input
              id="nova-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Mínimo de {MIN_SENHA_PROPRIA} caracteres.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmar-senha">Repita a nova senha</Label>
            <Input
              id="confirmar-senha"
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {((tentou && problema) || troca.error) && (
            <Alert variant="destructive">
              <AlertDescription>{troca.error?.message ?? problema}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="lg" disabled={troca.isPending}>
            {troca.isPending && <Loader2Icon className="animate-spin" />}
            Salvar senha
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
