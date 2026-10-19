import { AuthError } from '@supabase/supabase-js'
import { invocarAdminUsers } from '@/lib/funcoes'
import { supabase } from '@/lib/supabase'
import type { Enums, Tables } from '@/lib/database.types'
import { emailDaMatricula } from './matricula'

export type Papel = Enums<'app_role'>
export type Perfil = Tables<'profiles'>

export const chavePerfil = (userId: string) => ['perfil', userId] as const

export async function buscarMeuPerfil(userId: string): Promise<Perfil> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function entrar(matricula: string, senha: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailDaMatricula(matricula),
    password: senha,
  })
  if (error) throw new Error(mensagemDeErroDeLogin(error))
}

export async function sair(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function buscarPapeis(userId: string): Promise<Papel[]> {
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId)
  if (error) throw error
  return data.map((r) => r.role)
}

/** Troca a senha provisória pela senha escolhida pelo próprio usuário. */
export async function trocarMinhaSenha(senha: string): Promise<void> {
  await invocarAdminUsers<{ ok: true }>({ action: 'trocar_senha', senha })
}

function mensagemDeErroDeLogin(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Matrícula ou senha inválidas.'
    case 'user_banned':
      return 'Seu acesso está desativado. Fale com quem enviou sua matrícula.'
    case 'over_request_rate_limit':
      return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
    default:
      return 'Não foi possível entrar. Tente novamente.'
  }
}
