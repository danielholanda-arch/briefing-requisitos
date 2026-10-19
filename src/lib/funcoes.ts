import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

/** Chama a Edge Function admin-users e devolve a mensagem de erro dela, se houver. */
export async function invocarAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('admin-users', { body })
  if (error) {
    let mensagem = 'Não foi possível concluir a operação.'
    if (error instanceof FunctionsHttpError) {
      const corpo: unknown = await error.context.json().catch(() => null)
      if (corpo && typeof corpo === 'object' && 'error' in corpo && typeof corpo.error === 'string') {
        mensagem = corpo.error
      }
    }
    throw new Error(mensagem)
  }
  return data as T
}
