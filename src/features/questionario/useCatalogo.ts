import { useQuery } from '@tanstack/react-query'
import { buscarCatalogo, chaves } from './api'

/** Todos os questionários (seções e perguntas) vindos do banco, para usuário e admin. */
export function useCatalogo() {
  return useQuery({
    queryKey: chaves.catalogo,
    queryFn: buscarCatalogo,
    staleTime: 60_000,
  })
}
