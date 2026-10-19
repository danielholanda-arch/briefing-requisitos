import { useEffect, useRef, useState, type DragEvent } from 'react'
import { ExternalLinkIcon, FileIcon, Loader2Icon, Trash2Icon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ehListaDeArquivos, type ValorResposta } from '@/data/respostas'
import {
  abrirArquivo,
  ACEITOS,
  enviarArquivo,
  formatarTamanho,
  MAX_ARQUIVOS,
  problemaDoArquivo,
  removerArquivo,
  ROTULO_FORMATOS,
  type ArquivoAnexado,
} from '@/lib/arquivos'
import { cn } from '@/lib/utils'

interface Props {
  questionId: string
  /** Sem projeto (pré-visualização no editor): só mostra o campo, sem enviar */
  projetoId?: string
  valor: ValorResposta | null
  desabilitada: boolean
  onChange: (valor: ArquivoAnexado[]) => void
}

/** Pergunta do tipo "arquivos": envia para o bucket privado e guarda a lista na resposta. */
export function CampoArquivos({ questionId, projetoId, valor, desabilitada, onChange }: Props) {
  const arquivos = ehListaDeArquivos(valor) ? valor : []
  // Lista atual, para várias operações seguidas não se atropelarem
  const lista = useRef(arquivos)
  useEffect(() => {
    lista.current = arquivos
  })
  const entrada = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(0)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState(false)

  const bloqueado = desabilitada || !projetoId
  const restantes = MAX_ARQUIVOS - arquivos.length - enviando

  async function adicionar(selecionados: File[]) {
    if (!projetoId || selecionados.length === 0) return
    if (selecionados.length > restantes) {
      toast.error(`Limite de ${MAX_ARQUIVOS} arquivos por pergunta.`)
      selecionados = selecionados.slice(0, Math.max(restantes, 0))
    }
    for (const arquivo of selecionados) {
      const problema = problemaDoArquivo(arquivo)
      if (problema) {
        toast.error(problema)
        continue
      }
      setEnviando((n) => n + 1)
      try {
        const novo = await enviarArquivo(projetoId, questionId, arquivo)
        lista.current = [...lista.current, novo]
        onChange(lista.current)
      } catch (e) {
        toast.error((e as Error).message)
      } finally {
        setEnviando((n) => n - 1)
      }
    }
  }

  async function remover(arquivo: ArquivoAnexado) {
    setRemovendo(arquivo.caminho)
    try {
      await removerArquivo(arquivo.caminho)
      lista.current = lista.current.filter((a) => a.caminho !== arquivo.caminho)
      onChange(lista.current)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRemovendo(null)
    }
  }

  async function abrir(arquivo: ArquivoAnexado) {
    try {
      await abrirArquivo(arquivo)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  function aoSoltar(e: DragEvent) {
    e.preventDefault()
    setArrastando(false)
    if (!bloqueado) void adicionar([...e.dataTransfer.files])
  }

  return (
    <div className="flex flex-col gap-3">
      {arquivos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {arquivos.map((a) => (
            <li key={a.caminho} className="flex items-center gap-3 rounded-lg border bg-background/50 px-3 py-2">
              <FileIcon className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.nome}</p>
                <p className="text-xs text-muted-foreground">{formatarTamanho(a.tamanho)}</p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Abrir ${a.nome}`} title="Abrir" onClick={() => void abrir(a)}>
                <ExternalLinkIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover ${a.nome}`}
                title="Remover"
                disabled={bloqueado || removendo !== null}
                onClick={() => void remover(a)}
              >
                {removendo === a.caminho ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {restantes > 0 || enviando > 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!bloqueado) setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={aoSoltar}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
            arrastando ? 'border-primary bg-accent' : 'bg-background/40',
            bloqueado && 'opacity-60',
          )}
        >
          {enviando > 0 ? (
            <Loader2Icon className="size-5 animate-spin text-primary" />
          ) : (
            <UploadIcon className="size-5 text-muted-foreground" />
          )}
          <p className="text-sm">
            {enviando > 0 ? 'Enviando…' : 'Arraste arquivos aqui ou'}{' '}
            {enviando === 0 && (
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline disabled:pointer-events-none"
                onClick={() => entrada.current?.click()}
                disabled={bloqueado}
              >
                escolha no computador
              </button>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {ROTULO_FORMATOS} · até 10 MB · {restantes > 0 ? `mais ${restantes}` : 'limite atingido'}
            {!projetoId && ' · pré-visualização'}
          </p>
          <input
            ref={entrada}
            type="file"
            multiple
            accept={ACEITOS}
            className="hidden"
            onChange={(e) => {
              void adicionar([...(e.target.files ?? [])])
              e.target.value = '' // permite escolher o mesmo arquivo de novo
            }}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Limite de {MAX_ARQUIVOS} arquivos atingido.</p>
      )}
    </div>
  )
}
