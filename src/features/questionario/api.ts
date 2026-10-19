import { supabase } from '@/lib/supabase'
import type { Json, Tables } from '@/lib/database.types'
import { montarQuestionario, type Questionario } from '@/data/questions'
import type { Resposta, ValorResposta } from '@/data/respostas'

export type Projeto = Tables<'projetos'>

export const chaves = {
  questionario: ['questionario'] as const,
  meusProjetos: (userId: string) => ['projetos', 'meus', userId] as const,
  projeto: (id: string) => ['projeto', id] as const,
  respostas: (projetoId: string) => ['respostas', projetoId] as const,
}

/** Seções e perguntas (o RLS devolve só as ativas para clientes; todas para admins). */
export async function buscarQuestionario(): Promise<Questionario> {
  const [secoes, perguntas] = await Promise.all([
    supabase.from('secoes').select('*').order('ordem'),
    supabase.from('perguntas').select('*').order('ordem'),
  ])
  if (secoes.error) throw secoes.error
  if (perguntas.error) throw perguntas.error
  return montarQuestionario(secoes.data, perguntas.data)
}

export async function buscarMeusProjetos(userId: string): Promise<Projeto[]> {
  const { data, error } = await supabase
    .from('projetos')
    .select('*')
    .eq('cliente_id', userId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function buscarProjeto(id: string): Promise<Projeto | null> {
  const { data, error } = await supabase.from('projetos').select('*').eq('id', id).maybeSingle()
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

export async function enviarBriefing(projetoId: string): Promise<void> {
  const { error } = await supabase.rpc('enviar_briefing', { _projeto: projetoId })
  if (error) throw new Error(error.message || 'Não foi possível enviar o briefing.')
}
