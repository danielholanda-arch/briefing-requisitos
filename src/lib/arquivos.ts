import { supabase } from './supabase'

// Precisa bater com o bucket "anexos" (migration 20261019192915_anexos.sql)
const BUCKET = 'anexos'
export const MAX_ARQUIVOS = 5
export const MAX_TAMANHO = 10 * 1024 * 1024 // 10 MB

/** Formatos aceitos: extensão → tipo MIME (o bucket recusa os demais). */
const TIPOS: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
}

/** Para o atributo `accept` do input de arquivo. */
export const ACEITOS = Object.keys(TIPOS)
  .map((ext) => `.${ext}`)
  .join(',')
export const ROTULO_FORMATOS = 'PDF, Word, Excel, CSV, PowerPoint, imagem ou texto'

/** Arquivo anexado a uma resposta (fica em answers.value). */
export interface ArquivoAnexado {
  caminho: string
  nome: string
  tamanho: number
  tipo: string
}

function extensao(nome: string): string {
  return nome.split('.').pop()?.toLowerCase() ?? ''
}

/** Mensagem de erro, ou null se o arquivo pode ser enviado. */
export function problemaDoArquivo(arquivo: File): string | null {
  if (!TIPOS[extensao(arquivo.name)]) return `"${arquivo.name}": formato não aceito (${ROTULO_FORMATOS}).`
  if (arquivo.size > MAX_TAMANHO) return `"${arquivo.name}": maior que 10 MB.`
  return null
}

/** Nome seguro para o Storage: sem acento, espaço ou símbolo (o nome original fica na resposta). */
function nomeSeguro(nome: string): string {
  const ext = extensao(nome)
  const base = nome
    .slice(0, nome.length - ext.length - 1)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${base || 'arquivo'}.${ext}`
}

export async function enviarArquivo(
  projetoId: string,
  questionId: string,
  arquivo: File,
): Promise<ArquivoAnexado> {
  const caminho = `${projetoId}/${questionId}/${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`
  const tipo = TIPOS[extensao(arquivo.name)] ?? arquivo.type
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, { contentType: tipo })
  if (error) {
    throw new Error(`Não foi possível enviar "${arquivo.name}". Verifique o tamanho, o formato e o limite de ${MAX_ARQUIVOS} arquivos.`)
  }
  return { caminho, nome: arquivo.name, tamanho: arquivo.size, tipo }
}

export async function removerArquivo(caminho: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([caminho])
  if (error) throw new Error('Não foi possível remover o arquivo.')
}

/** Abre o arquivo num link temporário (o bucket é privado). */
export async function abrirArquivo(arquivo: ArquivoAnexado): Promise<void> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(arquivo.caminho, 60, { download: arquivo.nome })
  if (error) throw new Error('Não foi possível abrir o arquivo.')
  window.open(data.signedUrl, '_blank', 'noopener')
}

/** Remove todos os arquivos de um projeto ({projeto}/{pergunta}/{arquivo}). Usado ao excluir o projeto. */
export async function removerArquivosDoProjeto(projetoId: string): Promise<void> {
  const { data: pastas, error } = await supabase.storage.from(BUCKET).list(projetoId)
  if (error) throw new Error('Não foi possível listar os arquivos do projeto.')
  const caminhos: string[] = []
  for (const pasta of pastas) {
    const { data: arquivos } = await supabase.storage.from(BUCKET).list(`${projetoId}/${pasta.name}`)
    for (const a of arquivos ?? []) caminhos.push(`${projetoId}/${pasta.name}/${a.name}`)
  }
  if (caminhos.length) {
    const { error: eRemover } = await supabase.storage.from(BUCKET).remove(caminhos)
    if (eRemover) throw new Error('Não foi possível remover os arquivos do projeto.')
  }
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
