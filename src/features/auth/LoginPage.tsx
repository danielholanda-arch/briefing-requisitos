import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowRightIcon, EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
import { FundoFuturista } from '@/components/FundoFuturista'
import { Marca } from '@/components/Marca'
import { TelaCarregando } from '@/components/TelaCarregando'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { entrar } from './api'
import { normalizarMatricula } from './matricula'
import { useAuth } from './useAuth'

export function LoginPage() {
  const { user, carregando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = (location.state as { de?: string } | null)?.de ?? '/'

  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const login = useMutation({
    mutationFn: () => entrar(matricula, senha),
    onSuccess: () => navigate(destino, { replace: true }),
  })

  if (carregando) return <TelaCarregando />
  if (user && !login.isPending) return <Navigate to={destino} replace />

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    login.mutate()
  }

  return (
    // `dark` deixa o login sempre no visual escuro, independente do tema escolhido
    <main className="dark relative min-h-svh overflow-hidden bg-uc-noite text-foreground">
      <FundoFuturista />

      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-10">
        <Marca className="text-lg" />
        <div className="relative mx-auto w-full max-w-sm">
          <div
            className="absolute -inset-px rounded-2xl bg-linear-to-br from-uc-laranja/70 via-white/10 to-uc-verde/60 opacity-80"
            aria-hidden
          />
          <div className="relative rounded-2xl bg-card/85 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <h1 className="text-xl font-semibold tracking-tight">Entrar</h1>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="matricula">Matrícula</Label>
                <Input
                  id="matricula"
                  value={matricula}
                  onChange={(e) => setMatricula(normalizarMatricula(e.target.value))}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="h-10 font-mono"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="current-password"
                    className="h-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1 -translate-y-1/2"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
              </div>

              {login.error && (
                <Alert variant="destructive">
                  <AlertDescription>{login.error.message}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={login.isPending}
                className="mt-2 h-10 shadow-[0_0_24px_-6px] shadow-primary transition-shadow hover:shadow-[0_0_32px_-4px]"
              >
                {login.isPending ? <Loader2Icon className="animate-spin" /> : null}
                Entrar
                {!login.isPending && <ArrowRightIcon data-icon="inline-end" />}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}

