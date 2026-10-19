import { useEffect, useState } from 'react'

export type Tema = 'light' | 'dark'

// Mesma chave usada pelo script em index.html (aplica o tema antes do React carregar)
const CHAVE = 'briefing-tema'
const EVENTO = 'briefing-tema'

function temaAtual(): Tema {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** Tema claro/escuro: começa pela preferência do sistema e lembra a escolha no navegador. */
export function useTema() {
  const [tema, setEstado] = useState<Tema>(temaAtual)

  useEffect(() => {
    const sincronizar = () => setEstado(temaAtual())
    window.addEventListener(EVENTO, sincronizar)
    return () => window.removeEventListener(EVENTO, sincronizar)
  }, [])

  function setTema(novo: Tema) {
    document.documentElement.classList.toggle('dark', novo === 'dark')
    try {
      localStorage.setItem(CHAVE, novo)
    } catch {
      // navegação privada etc.: só não lembra a escolha
    }
    window.dispatchEvent(new Event(EVENTO))
  }

  return { tema, setTema }
}
