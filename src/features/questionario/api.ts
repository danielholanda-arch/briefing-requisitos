import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/database.types'
import { montarCatalogo, type Catalogo } from '@/data/questions'
import type { Resposta, ValorResposta } from '@/data/respostas'
import type { ProjetoComAnexos } from '@/data/status'

export const chaves = {
  catalogo: ['catalogo'] as const,
  meusProjetos: (userId: string) => ['projetos', 'meus', userId] as const,
  projeto: (id: string) => ['projeto', id] as const,
  respostas: (projetoId: string) => ['respostas', projetoId] as const,
}

/**
 * Todos os questionários com seções e perguntas
 * (o RLS devolve só as perguntas ativas para usuários; todas para admins).
 */
export async function buscarCatalogo(): Promise<Catalogo> {
  const [questionarios, secoes, perguntas] = await Promise.all([
    supabase.from('questionarios').select('*'),
    supabase.from('secoes').select('*').order('ordem'),
    supabase.from('perguntas').select('*').order('ordem'),
  ])
  if (questionarios.error) throw questionarios.error
  if (secoes.error) throw secoes.error
  if (perguntas.error) throw perguntas.error
  return montarCatalogo(questionarios.data, secoes.data, perguntas.data)
}

const COM_ANEXOS = '*, anexos:projeto_questionarios(*)'

export async function buscarMeusProjetos(userId: string): Promise<ProjetoComAnexos[]> {
  const { data, error } = await supabase
    .from('projetos')
    .select(COM_ANEXOS)
    .eq('cliente_id', userId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function buscarProjeto(id: string): Promise<ProjetoComAnexos | null> {
  const { data, error } = await supabase.from('projetos').select(COM_ANEXOS).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function buscarRespostas(projetoId: string): Promise<Resposta[]> {
  const { data, error } = await supabase.from('answers').select('*').eq('projeto_id', projetoId)
  if (error) throw error
  return data
}

/** Respostas de vários projetos de uma vez (para mostrar o progresso na lista). */
export async function buscarRespostasDosProjetos(ids: string[]): Promise<Resposta[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('answers').select('*').in('projeto_id', ids)
  if (error) throw error
  return data
}

export interface RascunhoResposta {
  questionId: string
  valor: ValorResposta | null
  skipped: boolean
}

export async function salvarResposta(projetoId: string, r: RascunhoResposta): Promise<Resposta> {
  const { data, error } = await supabase
    .from('answers')
    .upsert(
      {
        projeto_id: projetoId,
        question_id: r.questionId,
        value: r.valor as Json,
        skipped: r.skipped,
      },
      { onConflict: 'projeto_id,question_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

/** Envia UM questionário do projeto; os outros anexos continuam como estão. */
export async function enviarQuestionario(projetoId: string, questionarioId: string): Promise<void> {
  const { error } = await supabase.rpc('enviar_briefing', {
    _projeto: projetoId,
    _questionario: questionarioId,
  })
  if (error) throw new Error(error.message || 'Não foi possível enviar o questionário.')
}
