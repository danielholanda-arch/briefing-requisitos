import { useCallback, useEffect, useRef, useState } from 'react'

export type EstadoAutosave = 'ocioso' | 'pendente' | 'salvando' | 'salvo' | 'erro'

/**
 * Salva com atraso (debounce) o último valor agendado.
 * Os salvamentos rodam em fila, então nunca chegam fora de ordem ao servidor.
 * Ao desmontar (trocar de seção, por exemplo) o que estiver pendente é salvo na hora.
 */
export function useAutosave<T>(salvar: (valor: T) => Promise<void>, atrasoMs = 800) {
  const [estado, setEstado] = useState<EstadoAutosave>('ocioso')
  const salvarRef = useRef(salvar)
  const pendente = useRef<{ valor: T } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const fila = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    salvarRef.current = salvar
  })

  const flush = useCallback((): Promise<void> => {
    window.clearTimeout(timer.current)
    const item = pendente.current
    if (!item) return fila.current
    pendente.current = null

    fila.current = fila.current.then(async () => {
      setEstado('salvando')
      try {
        await salvarRef.current(item.valor)
        setEstado(pendente.current ? 'pendente' : 'salvo')
      } catch {
        // Mantém o valor para a próxima tentativa, a menos que já exista um mais novo
        pendente.current ??= item
        setEstado('erro')
      }
    })
    return fila.current
  }, [])

  const agendar = useCallback(
    (valor: T) => {
      pendente.current = { valor }
      setEstado('pendente')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void flush(), atrasoMs)
    },
    [flush, atrasoMs],
  )

  // Salva o que faltar ao desmontar
  useEffect(() => () => void flush(), [flush])

  // Avisa antes de fechar a aba com algo ainda não salvo
  const temPendencia = estado === 'pendente' || estado === 'salvando' || estado === 'erro'
  useEffect(() => {
    if (!temPendencia) return
    const aviso = (e: BeforeUnloadEvent) => {
      void flush()
      e.preventDefault()
    }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [temPendencia, flush])

  return { estado, agendar, tentarDeNovo: flush }
}
