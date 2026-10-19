export { cn } from "cn"

const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function formatarDataHora(iso: string | null | undefined): string {
  return iso ? dataHora.format(new Date(iso)) : '—'
}

/**
 * Máscara de telefone brasileiro, aplicada enquanto digita e na exibição:
 * (88) 3333-4444 (fixo) ou (88) 99700-0530 (celular). Aceita texto com ou sem máscara.
 */
export function formatarTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  const ddd = d.slice(0, 2)
  const resto = d.slice(2)
  if (resto.length <= 4) return `(${ddd}) ${resto}`
  // 9 dígitos depois do DDD = celular (5 + 4); até 8 = fixo (4 + 4)
  const corte = resto.length > 8 ? 5 : 4
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`
}
