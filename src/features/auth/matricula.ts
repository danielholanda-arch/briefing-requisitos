// Precisa ser o MESMO domínio da Edge Function (supabase/functions/admin-users/index.ts)
export const DOMINIO = 'briefing.local'

/** Letras minúsculas e números, ex.: abcd1234. Igual à constraint profiles_matricula_formato. */
export const FORMATO_MATRICULA = /^[a-z0-9]{3,30}$/

/** E-mail de contato (o login continua sendo pela matrícula). Igual à constraint profiles_email_formato. */
export const FORMATO_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Senha provisória sugerida no cadastro e no reset. O usuário troca no primeiro acesso. */
export const SENHA_PADRAO = 'ead123'
export const MIN_SENHA_PROVISORIA = 6
export const MIN_SENHA_PROPRIA = 8

/** Minúsculas e sem espaços: dá para digitar ABCD1234 ou abcd1234. */
export function normalizarMatricula(matricula: string): string {
  return matricula.replace(/\s/g, '').toLowerCase()
}

export function emailDaMatricula(matricula: string): string {
  return `${normalizarMatricula(matricula)}@${DOMINIO}`
}
