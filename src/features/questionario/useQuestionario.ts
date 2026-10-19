import { useQuery } from '@tanstack/react-query'
import { buscarQuestionario, chaves } from './api'

/** Seções e perguntas vindas do banco (compartilhado entre cliente e admin). */
export function useQuestionario() {
  return useQuery({
    queryKey: chaves.questionario,
    queryFn: buscarQuestionario,
    staleTime: 60_000,
  })
}
