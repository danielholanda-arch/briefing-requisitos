import type { Enums, Tables } from '@/lib/database.types'
import type { Catalogo } from './questions'
import { contarTratadas, type Resposta } from './respostas'

export type Status = Enums<'briefing_status'>
export type Projeto = Tables<'projetos'>
/** Questionário anexado a um projeto, com status e envio próprios */
export type Anexo = Tables<'projeto_questionarios'>

export interface ProjetoComAnexos extends Projeto {
  anexos: Anexo[]
}

/** Status geral do projeto, a partir dos questionários anexados. */
export function statusDoProjeto(anexos: Anexo[]): Status {
  if (anexos.length === 0) return 'nao_iniciado'
  if (anexos.every((a) => a.status === 'concluido')) return 'concluido'
  if (anexos.some((a) => a.status !== 'nao_iniciado')) return 'em_andamento'
  return 'nao_iniciado'
}

/** Data do último envio entre os questionários do projeto. */
export function ultimoEnvio(anexos: Anexo[]): string | null {
  const datas = anexos.map((a) => a.enviado_em).filter((d): d is string => d !== null)
  return datas.sort().at(-1) ?? null
}

/** Perguntas tratadas / total, somando todos os questionários anexados ao projeto. */
export function progressoDoProjeto(
  projeto: ProjetoComAnexos,
  catalogo: Catalogo | undefined,
  respostas: Map<string, Resposta>,
): { feitas: number; total: number } {
  let feitas = 0
  let total = 0
  for (const a of projeto.anexos) {
    const q = catalogo?.porId.get(a.questionario_id)
    if (!q) continue
    feitas += contarTratadas(q.ativas, respostas)
    total += q.ativas.length
  }
  return { feitas, total }
}
