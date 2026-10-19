import type { ArquivoAnexado } from '@/lib/arquivos'
import type { Json, Tables } from '@/lib/database.types'
import type { Pergunta } from './questions'

export type Resposta = Tables<'answers'>

export interface ValorComOutro {
  opcoes: string[]
  outro: string
}

/**
 * Formato gravado em `answers.value`, conforme o tipo da pergunta:
 * - texto / texto_longo / escolha_unica: string
 * - multipla_escolha: string[]
 * - escala: number
 * - escolha com `permiteOutro`: { opcoes, outro }
 * - arquivos: ArquivoAnexado[] ({ caminho, nome, tamanho, tipo })
 */
export type ValorResposta = string | string[] | number | ValorComOutro | ArquivoAnexado[]

export function ehListaDeArquivos(valor: ValorResposta | null): valor is ArquivoAnexado[] {
  return Array.isArray(valor) && valor.length > 0 && typeof valor[0] === 'object'
}

function lerArquivo(v: Json): ArquivoAnexado | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  if (typeof v.caminho !== 'string' || typeof v.nome !== 'string') return null
  return {
    caminho: v.caminho,
    nome: v.nome,
    tamanho: typeof v.tamanho === 'number' ? v.tamanho : 0,
    tipo: typeof v.tipo === 'string' ? v.tipo : '',
  }
}

export function lerValor(json: Json | null | undefined): ValorResposta | null {
  if (typeof json === 'string' || typeof json === 'number') return json
  if (Array.isArray(json)) {
    // Lista de objetos = arquivos anexados; lista de textos = múltipla escolha
    if (json.some((v) => v !== null && typeof v === 'object')) {
      return json.map(lerArquivo).filter((a): a is ArquivoAnexado => a !== null)
    }
    return json.filter((v): v is string => typeof v === 'string')
  }
  if (json && typeof json === 'object') {
    const opcoes = Array.isArray(json.opcoes)
      ? json.opcoes.filter((v): v is string => typeof v === 'string')
      : []
    return { opcoes, outro: typeof json.outro === 'string' ? json.outro : '' }
  }
  return null
}

export function valorPreenchido(valor: ValorResposta | null): boolean {
  if (valor === null) return false
  if (typeof valor === 'string') return valor.trim() !== ''
  if (typeof valor === 'number') return true
  if (Array.isArray(valor)) return valor.length > 0
  return valor.opcoes.length > 0 || valor.outro.trim() !== ''
}

/** Respondida ou marcada como "prefiro conversar na reunião". */
export function perguntaTratada(resposta: Resposta | undefined): boolean {
  if (!resposta) return false
  return resposta.skipped || valorPreenchido(lerValor(resposta.value))
}

export function formatarValor(pergunta: Pergunta, valor: ValorResposta | null): string {
  if (!valorPreenchido(valor) || valor === null) return ''
  if (typeof valor === 'number') {
    return pergunta.tipo === 'escala' ? `${valor} de ${pergunta.max}` : String(valor)
  }
  if (typeof valor === 'string') return valor
  if (ehListaDeArquivos(valor)) return valor.map((a) => a.nome).join(', ')
  if (Array.isArray(valor)) return valor.join(', ')
  const outro = valor.outro.trim()
  return [...valor.opcoes, ...(outro ? [`Outro: ${outro}`] : [])].join(', ')
}

export function indexarRespostas(respostas: Resposta[]): Map<string, Resposta> {
  return new Map(respostas.map((r) => [r.question_id, r]))
}

/** Quantas perguntas ativas já foram respondidas ou deixadas para a reunião. */
export function contarTratadas(ativas: Pergunta[], respostas: Map<string, Resposta>): number {
  return ativas.filter((p) => perguntaTratada(respostas.get(p.id))).length
}

export function agruparPorProjeto(respostas: Resposta[]): Map<string, Map<string, Resposta>> {
  const grupos = new Map<string, Map<string, Resposta>>()
  for (const r of respostas) {
    const grupo = grupos.get(r.projeto_id) ?? new Map<string, Resposta>()
    grupo.set(r.question_id, r)
    grupos.set(r.projeto_id, grupo)
  }
  return grupos
}
