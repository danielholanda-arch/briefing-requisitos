import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/lib/database.types'
import { invocarAdminUsers } from '@/lib/funcoes'
import { agruparPorProjeto, type Resposta } from '@/data/respostas'
import type { ProjetoComAnexos } from '@/data/status'

export type Perfil = Tables<'profiles'>
export type Projeto = Tables<'projetos'>
export type Papel = 'cliente' | 'admin'
export type { ProjetoComAnexos }

export interface ClienteComProjetos extends Perfil {
  projetos: ProjetoComAnexos[]
}

const COM_ANEXOS = '*, anexos:projeto_questionarios(*)'

export const chavesAdmin = {
  clientes: ['admin', 'clientes'] as const,
  admins: ['admin', 'admins'] as const,
  cliente: (id: string) => ['admin', 'cliente', id] as const,
  projeto: (id: string) => ['admin', 'projeto', id] as const,
  respostas: (projetoId: string) => ['admin', 'respostas', projetoId] as const,
  contagemRespostas: ['admin', 'contagem-respostas'] as const,
  usoQuestionarios: ['admin', 'uso-questionarios'] as const,
}

async function idsComPapel(papel: Papel): Promise<string[]> {
  const { data, error } = await supabase.from('user_roles').select('user_id').eq('role', papel)
  if (error) throw error
  return data.map((p) => p.user_id)
}

// Clientes e projetos -------------------------------------------------------

export async function listarClientes(): Promise<{
  clientes: ClienteComProjetos[]
  respostas: Map<string, Map<string, Resposta>>
}> {
  const ids = await idsComPapel('cliente')
  if (ids.length === 0) return { clientes: [], respostas: new Map() }

  const [perfis, projetos] = await Promise.all([
    supabase.from('profiles').select('*').in('id', ids).order('created_at', { ascending: false }),
    supabase.from('projetos').select(COM_ANEXOS).in('cliente_id', ids).order('created_at'),
  ])
  if (perfis.error) throw perfis.error
  if (projetos.error) throw projetos.error

  const idsProjetos = projetos.data.map((p) => p.id)
  const respostas = idsProjetos.length
    ? await supabase.from('answers').select('*').in('projeto_id', idsProjetos)
    : { data: [] as Resposta[], error: null }
  if (respostas.error) throw respostas.error

  return {
    clientes: perfis.data.map((perfil) => ({
      ...perfil,
      projetos: projetos.data.filter((p) => p.cliente_id === perfil.id),
    })),
    respostas: agruparPorProjeto(respostas.data),
  }
}

export async function buscarCliente(id: string): Promise<{
  cliente: Perfil | null
  projetos: ProjetoComAnexos[]
  respostas: Map<string, Map<string, Resposta>>
}> {
  const [perfil, projetos] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('projetos').select(COM_ANEXOS).eq('cliente_id', id).order('created_at'),
  ])
  if (perfil.error) throw perfil.error
  if (projetos.error) throw projetos.error

  const ids = projetos.data.map((p) => p.id)
  const respostas = ids.length
    ? await supabase.from('answers').select('*').in('projeto_id', ids)
    : { data: [] as Resposta[], error: null }
  if (respostas.error) throw respostas.error

  return { cliente: perfil.data, projetos: projetos.data, respostas: agruparPorProjeto(respostas.data) }
}

export async function buscarProjetoComCliente(id: string) {
  const { data, error } = await supabase
    .from('projetos')
    .select('*, cliente:profiles(*), anexos:projeto_questionarios(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function buscarRespostasDoProjeto(projetoId: string): Promise<Resposta[]> {
  const { data, error } = await supabase.from('answers').select('*').eq('projeto_id', projetoId)
  if (error) throw error
  return data
}

export async function criarProjeto(clienteId: string, nome: string): Promise<Projeto> {
  const { data, error } = await supabase
    .from('projetos')
    .insert({ cliente_id: clienteId, nome: nome.trim() })
    .select()
    .single()
  if (error) throw new Error('Não foi possível criar o projeto.')
  return data
}

export async function renomearProjeto(id: string, nome: string): Promise<void> {
  const { error } = await supabase.from('projetos').update({ nome: nome.trim() }).eq('id', id)
  if (error) throw new Error('Não foi possível renomear o projeto.')
}

// Questionários anexados ao projeto ---------------------------------------

export async function anexarQuestionario(projetoId: string, questionarioId: string): Promise<void> {
  const { error } = await supabase
    .from('projeto_questionarios')
    .insert({ projeto_id: projetoId, questionario_id: questionarioId })
  if (error) {
    throw new Error(
      error.code === '23505' ? 'Este questionário já está no projeto.' : 'Não foi possível anexar o questionário.',
    )
  }
}

/** Remove o questionário do projeto (a tela só oferece isso quando não há respostas dele). */
export async function removerQuestionario(projetoId: string, questionarioId: string): Promise<void> {
  const { error } = await supabase
    .from('projeto_questionarios')
    .delete()
    .eq('projeto_id', projetoId)
    .eq('questionario_id', questionarioId)
  if (error) throw new Error('Não foi possível remover o questionário.')
}

/** Só o admin reabre um questionário enviado. */
export async function reabrirQuestionario(projetoId: string, questionarioId: string): Promise<void> {
  const { error } = await supabase
    .from('projeto_questionarios')
    .update({ status: 'em_andamento', enviado_em: null })
    .eq('projeto_id', projetoId)
    .eq('questionario_id', questionarioId)
  if (error) throw new Error('Não foi possível reabrir o questionário.')
}

/** Apaga o projeto e as respostas dele. */
export async function excluirProjeto(id: string): Promise<void> {
  const { error } = await supabase.from('projetos').delete().eq('id', id)
  if (error) throw new Error('Não foi possível excluir o projeto.')
}

// Dados do usuário (o admin edita direto; matrícula e papel não mudam por aqui) -----

export interface DadosUsuario {
  nome: string
  email: string
  telefone: string
  empresa: string
}

export async function atualizarDados(id: string, dados: DadosUsuario): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase() || null,
      telefone: dados.telefone.trim() || null,
      empresa: dados.empresa.trim() || null,
    })
    .eq('id', id)
  if (error) {
    throw new Error(error.code === '23514' ? 'E-mail inválido.' : 'Não foi possível salvar os dados.')
  }
}

// Administradores ------------------------------------------------------------

export async function listarAdmins(): Promise<Perfil[]> {
  const ids = await idsComPapel('admin')
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('profiles').select('*').in('id', ids).order('nome')
  if (error) throw error
  return data
}

// Perguntas -------------------------------------------------------------------

export type NovoQuestionario = TablesInsert<'questionarios'>
export type NovaSecao = TablesInsert<'secoes'>

export async function salvarQuestionario(q: NovoQuestionario): Promise<string> {
  const { data, error } = await supabase.from('questionarios').upsert(q).select('id').single()
  if (error) throw new Error('Não foi possível salvar o questionário.')
  return data.id
}

export async function excluirQuestionario(id: string): Promise<void> {
  const { error } = await supabase.from('questionarios').delete().eq('id', id)
  if (error) {
    throw new Error(
      error.code === '23503'
        ? 'O questionário ainda tem seções ou está anexado a projetos.'
        : 'Não foi possível excluir o questionário.',
    )
  }
}

/** Em quantos projetos cada questionário está anexado. */
export async function contarUsoDosQuestionarios(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('projeto_questionarios').select('questionario_id')
  if (error) throw error
  const uso = new Map<string, number>()
  for (const { questionario_id } of data) uso.set(questionario_id, (uso.get(questionario_id) ?? 0) + 1)
  return uso
}
export type NovaPergunta = TablesInsert<'perguntas'>

/** Id novo e estável (nunca muda depois de criado). */
export function gerarId(prefixo: 's' | 'p'): string {
  const aleatorio = crypto.getRandomValues(new Uint32Array(2))
  return `${prefixo}_${[...aleatorio].map((n) => n.toString(36)).join('')}`.slice(0, 20)
}

export async function salvarSecao(secao: NovaSecao): Promise<void> {
  const { error } = await supabase.from('secoes').upsert(secao)
  if (error) throw new Error(`Não foi possível salvar a seção: ${error.message}`)
}

export async function excluirSecao(id: string): Promise<void> {
  const { error } = await supabase.from('secoes').delete().eq('id', id)
  if (error) {
    throw new Error(
      error.code === '23503'
        ? 'A seção ainda tem perguntas. Mova ou exclua as perguntas antes.'
        : 'Não foi possível excluir a seção.',
    )
  }
}

export async function salvarPergunta(pergunta: NovaPergunta): Promise<void> {
  const { error } = await supabase.from('perguntas').upsert(pergunta)
  if (error) throw new Error(error.message)
}

export async function definirPerguntaAtiva(id: string, ativa: boolean): Promise<void> {
  const { error } = await supabase.from('perguntas').update({ ativa }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirPergunta(id: string): Promise<void> {
  const { error } = await supabase.from('perguntas').delete().eq('id', id)
  if (error) {
    throw new Error(
      error.code === '23503'
        ? 'Esta pergunta já tem respostas e não pode ser excluída. Arquive-a.'
        : 'Não foi possível excluir a pergunta.',
    )
  }
}

/** Troca a ordem de dois itens vizinhos. */
export async function trocarOrdem(
  tabela: 'secoes' | 'perguntas',
  a: { id: string; ordem: number },
  b: { id: string; ordem: number },
): Promise<void> {
  // Se as ordens forem iguais, separa para a troca ter efeito
  const ordemA = a.ordem === b.ordem ? b.ordem + 1 : b.ordem
  const r1 = await supabase.from(tabela).update({ ordem: ordemA }).eq('id', a.id)
  if (r1.error) throw new Error('Não foi possível reordenar.')
  const r2 = await supabase.from(tabela).update({ ordem: a.ordem }).eq('id', b.id)
  if (r2.error) throw new Error('Não foi possível reordenar.')
}

/** Quantos projetos responderam cada pergunta (para avisar antes de editar). */
export async function contarRespostasPorPergunta(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('answers').select('question_id')
  if (error) throw error
  const contagem = new Map<string, number>()
  for (const { question_id } of data) contagem.set(question_id, (contagem.get(question_id) ?? 0) + 1)
  return contagem
}

// Edge Function admin-users ------------------------------------------------

export interface NovoUsuario {
  papel: Papel
  matricula: string
  senha: string
  nome: string
  email?: string
  empresa?: string
  telefone?: string
  /** Nome do primeiro projeto (só para cliente) */
  projeto?: string
}

export interface Credenciais {
  matricula: string
  senha: string
}

export function criarUsuario(novo: NovoUsuario) {
  return invocarAdminUsers<Credenciais & { user_id: string }>({ action: 'create', ...novo })
}

export function resetarSenha(userId: string, senha: string) {
  return invocarAdminUsers<Credenciais>({ action: 'reset_password', user_id: userId, senha })
}

export function definirAtivo(userId: string, ativo: boolean) {
  return invocarAdminUsers<{ ok: true }>({ action: 'set_active', user_id: userId, ativo })
}

export function excluirCliente(userId: string) {
  return invocarAdminUsers<{ ok: true }>({ action: 'delete', user_id: userId })
}
