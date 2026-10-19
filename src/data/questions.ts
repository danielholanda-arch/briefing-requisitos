// Tipos do questionário e montagem a partir das tabelas `secoes` e `perguntas`.
//
// As perguntas ficam no banco e os admins editam pelo painel (/admin/perguntas).
// O `id` de cada pergunta é a chave gravada em `answers.question_id` e NUNCA muda
// (o banco bloqueia). Para mudar o sentido de uma pergunta já respondida, arquive-a e crie outra.

import type { Enums, Tables } from '@/lib/database.types'

export type TipoPergunta = Enums<'tipo_pergunta'>
export type LinhaQuestionario = Tables<'questionarios'>
export type LinhaSecao = Tables<'secoes'>
export type LinhaPergunta = Tables<'perguntas'>

export const ROTULO_TIPO: Record<TipoPergunta, string> = {
  texto: 'Texto curto',
  texto_longo: 'Texto longo',
  escolha_unica: 'Escolha única',
  multipla_escolha: 'Múltipla escolha',
  escala: 'Escala',
}

interface PerguntaBase {
  id: string
  secaoId: string
  titulo: string
  ajuda?: string
  obrigatoria: boolean
  ativa: boolean
  ordem: number
}

export type Pergunta =
  | (PerguntaBase & { tipo: 'texto' | 'texto_longo'; placeholder?: string })
  | (PerguntaBase & {
      tipo: 'escolha_unica' | 'multipla_escolha'
      opcoes: string[]
      /** Mostra um campo "Outro" com texto livre. O valor vira { opcoes, outro }. */
      permiteOutro: boolean
    })
  | (PerguntaBase & {
      tipo: 'escala'
      min: number
      max: number
      rotuloMin: string
      rotuloMax: string
    })

export interface Secao {
  id: string
  titulo: string
  descricao?: string
  ordem: number
  perguntas: Pergunta[]
}

export interface Questionario {
  /** O que o cliente responde: só perguntas ativas, sem seções vazias */
  secoes: Secao[]
  /** Perguntas ativas, na ordem */
  ativas: Pergunta[]
  /** Numeração corrida (1, 2, 3…) das perguntas ativas */
  numero: Map<string, number>
  /** Todas as seções e perguntas, inclusive arquivadas (para o admin) */
  completo: Secao[]
  porId: Map<string, Pergunta>
}

export function linhaParaPergunta(l: LinhaPergunta): Pergunta {
  const base: PerguntaBase = {
    id: l.id,
    secaoId: l.secao_id,
    titulo: l.titulo,
    ajuda: l.ajuda ?? undefined,
    obrigatoria: l.obrigatoria,
    ativa: l.ativa,
    ordem: l.ordem,
  }
  switch (l.tipo) {
    case 'texto':
    case 'texto_longo':
      return { ...base, tipo: l.tipo, placeholder: l.placeholder ?? undefined }
    case 'escolha_unica':
    case 'multipla_escolha':
      return { ...base, tipo: l.tipo, opcoes: l.opcoes, permiteOutro: l.permite_outro }
    case 'escala':
      return {
        ...base,
        tipo: 'escala',
        min: l.escala_min ?? 1,
        max: l.escala_max ?? 5,
        rotuloMin: l.rotulo_min ?? '',
        rotuloMax: l.rotulo_max ?? '',
      }
  }
}

/** Um questionário (grupo de perguntas) já montado, com os dados da tabela `questionarios`. */
export interface QuestionarioMontado extends Questionario {
  info: LinhaQuestionario
}

export interface Catalogo {
  /** Questionários em ordem alfabética (padrão primeiro) */
  lista: QuestionarioMontado[]
  porId: Map<string, QuestionarioMontado>
}

export function montarCatalogo(
  questionarios: LinhaQuestionario[],
  secoes: LinhaSecao[],
  perguntas: LinhaPergunta[],
): Catalogo {
  const lista = [...questionarios]
    .sort((a, b) => Number(b.padrao) - Number(a.padrao) || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((info) => {
      const secoesDoQuestionario = secoes.filter((s) => s.questionario_id === info.id)
      const ids = new Set(secoesDoQuestionario.map((s) => s.id))
      return {
        info,
        ...montarQuestionario(
          secoesDoQuestionario,
          perguntas.filter((p) => ids.has(p.secao_id)),
        ),
      }
    })
  return { lista, porId: new Map(lista.map((q) => [q.info.id, q])) }
}

export function montarQuestionario(linhasSecao: LinhaSecao[], linhasPergunta: LinhaPergunta[]): Questionario {
  const porOrdem = <T extends { ordem: number }>(a: T, b: T) => a.ordem - b.ordem
  const perguntas = linhasPergunta.map(linhaParaPergunta).sort(porOrdem)

  const completo: Secao[] = [...linhasSecao].sort(porOrdem).map((s) => ({
    id: s.id,
    titulo: s.titulo,
    descricao: s.descricao ?? undefined,
    ordem: s.ordem,
    perguntas: perguntas.filter((p) => p.secaoId === s.id),
  }))

  const secoes = completo
    .map((s) => ({ ...s, perguntas: s.perguntas.filter((p) => p.ativa) }))
    .filter((s) => s.perguntas.length > 0)
  const ativas = secoes.flatMap((s) => s.perguntas)

  return {
    secoes,
    ativas,
    numero: new Map(ativas.map((p, i) => [p.id, i + 1])),
    completo,
    porId: new Map(perguntas.map((p) => [p.id, p])),
  }
}
