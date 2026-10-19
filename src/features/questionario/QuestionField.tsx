import { useId, useState, type ReactNode } from 'react'
import { AlertCircleIcon, CheckIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Pergunta } from '@/data/questions'
import { lerValor, type Resposta, type ValorComOutro, type ValorResposta } from '@/data/respostas'
import type { RascunhoResposta } from './api'
import { useAutosave, type EstadoAutosave } from './useAutosave'

interface Props {
  pergunta: Pergunta
  numero: number
  resposta: Resposta | undefined
  salvar: (r: RascunhoResposta) => Promise<void>
  /** Chamado a cada alteração, antes de salvar (para atualizar o progresso na hora) */
  onAlterar: (r: RascunhoResposta) => void
  /** Pré-visualização no editor de perguntas: não mostra o estado de salvamento */
  previa?: boolean
}

export function QuestionField({ pergunta, numero, resposta, salvar, onAlterar, previa }: Props) {
  const idBase = useId()
  const [valor, setValor] = useState<ValorResposta | null>(() => lerValor(resposta?.value))
  const [pulada, setPulada] = useState(resposta?.skipped ?? false)
  const { estado, agendar, tentarDeNovo } = useAutosave(salvar)

  function alterar(novo: { valor?: ValorResposta | null; skipped?: boolean }) {
    const r: RascunhoResposta = {
      questionId: pergunta.id,
      valor: novo.valor !== undefined ? novo.valor : valor,
      skipped: novo.skipped ?? pulada,
    }
    if (novo.valor !== undefined) setValor(novo.valor)
    if (novo.skipped !== undefined) setPulada(novo.skipped)
    onAlterar(r)
    agendar(r)
  }

  const idTitulo = `${idBase}-titulo`

  return (
    <fieldset className="flex flex-col gap-3" aria-labelledby={idTitulo}>
      <div className="flex items-start justify-between gap-3">
        <legend id={idTitulo} className="font-medium leading-snug">
          <span className="mr-2 font-mono text-xs text-primary tabular-nums">{String(numero).padStart(2, '0')}</span>
          {pergunta.titulo}
          {pergunta.obrigatoria && (
            <span className="ml-1 text-destructive" aria-label="obrigatória">
              *
            </span>
          )}
        </legend>
        {!previa && <IndicadorSalvamento estado={estado} onTentarDeNovo={() => void tentarDeNovo()} />}
      </div>
      {pergunta.ajuda && <p className="-mt-1.5 text-sm text-muted-foreground">{pergunta.ajuda}</p>}

      <div className={cn(pulada && 'pointer-events-none opacity-50')} aria-disabled={pulada}>
        <EntradaPergunta
          pergunta={pergunta}
          idBase={idBase}
          valor={valor}
          desabilitada={pulada}
          onChange={(v) => alterar({ valor: v })}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`${idBase}-pular`}
          checked={pulada}
          onCheckedChange={(c) => alterar({ skipped: c === true })}
        />
        <Label htmlFor={`${idBase}-pular`} className="text-sm font-normal text-muted-foreground">
          Tratar na reunião
        </Label>
      </div>
    </fieldset>
  )
}

function IndicadorSalvamento({
  estado,
  onTentarDeNovo,
}: {
  estado: EstadoAutosave
  onTentarDeNovo: () => void
}) {
  return (
    <span className="flex h-6 shrink-0 items-center text-xs text-muted-foreground" aria-live="polite">
      {(estado === 'pendente' || estado === 'salvando') && (
        <>
          <Loader2Icon className="mr-1 size-3 animate-spin" />
          Salvando…
        </>
      )}
      {estado === 'salvo' && (
        <>
          <CheckIcon className="mr-1 size-3" />
          Salvo
        </>
      )}
      {estado === 'erro' && (
        <Button variant="destructive" size="xs" onClick={onTentarDeNovo}>
          <AlertCircleIcon />
          Não salvou. Tentar de novo
        </Button>
      )}
    </span>
  )
}

interface EntradaProps {
  pergunta: Pergunta
  idBase: string
  valor: ValorResposta | null
  desabilitada: boolean
  onChange: (valor: ValorResposta | null) => void
}

function EntradaPergunta({ pergunta, idBase, valor, desabilitada, onChange }: EntradaProps) {
  switch (pergunta.tipo) {
    case 'texto':
      return (
        <Input
          aria-label={pergunta.titulo}
          value={typeof valor === 'string' ? valor : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={pergunta.placeholder}
          disabled={desabilitada}
        />
      )

    case 'texto_longo':
      return (
        <Textarea
          aria-label={pergunta.titulo}
          value={typeof valor === 'string' ? valor : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={pergunta.placeholder}
          disabled={desabilitada}
          rows={4}
          className="min-h-24"
        />
      )

    case 'escala': {
      const atual = typeof valor === 'number' ? valor : null
      const notas = Array.from({ length: pergunta.max - pergunta.min + 1 }, (_, i) => pergunta.min + i)
      return (
        // w-fit: os rótulos acompanham a largura da escala; no celular as colunas encolhem até caber
        <div className="flex w-fit max-w-full flex-col gap-1.5">
          <div
            className="grid gap-1.5 sm:gap-2"
            style={{ gridTemplateColumns: `repeat(${notas.length}, minmax(0, 2.5rem))` }}
            role="radiogroup"
            aria-label={pergunta.titulo}
          >
            {notas.map((n) => (
              <Button
                key={n}
                type="button"
                role="radio"
                aria-checked={atual === n}
                variant={atual === n ? 'default' : 'outline'}
                className="h-10 w-full min-w-0 px-0 tabular-nums"
                disabled={desabilitada}
                onClick={() => onChange(atual === n ? null : n)}
              >
                {n}
              </Button>
            ))}
          </div>
          <div className="flex justify-between gap-4 text-xs text-muted-foreground">
            <span>{pergunta.rotuloMin}</span>
            <span className="text-right">{pergunta.rotuloMax}</span>
          </div>
        </div>
      )
    }

    case 'escolha_unica':
      return pergunta.permiteOutro ? (
        <EscolhaUnicaComOutro {...{ pergunta, idBase, valor, desabilitada, onChange }} />
      ) : (
        <RadioGroup
          value={typeof valor === 'string' ? valor : ''}
          onValueChange={onChange}
          disabled={desabilitada}
          aria-label={pergunta.titulo}
        >
          {pergunta.opcoes.map((op, i) => (
            <Opcao key={op} id={`${idBase}-${i}`} label={op}>
              <RadioGroupItem id={`${idBase}-${i}`} value={op} />
            </Opcao>
          ))}
        </RadioGroup>
      )

    case 'multipla_escolha':
      return <MultiplaEscolha {...{ pergunta, idBase, valor, desabilitada, onChange }} />
  }
}

function Opcao({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      {children}
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  )
}

const OUTRO = '__outro__'

function comOutro(valor: ValorResposta | null): ValorComOutro {
  if (valor && typeof valor === 'object' && !Array.isArray(valor)) return valor
  if (typeof valor === 'string' && valor) return { opcoes: [valor], outro: '' }
  if (Array.isArray(valor)) return { opcoes: valor, outro: '' }
  return { opcoes: [], outro: '' }
}

function EscolhaUnicaComOutro({ pergunta, idBase, valor, desabilitada, onChange }: EntradaProps) {
  const atual = comOutro(valor)
  const [outroMarcado, setOutroMarcado] = useState(atual.outro !== '')
  if (pergunta.tipo !== 'escolha_unica') return null

  const selecionado = outroMarcado ? OUTRO : (atual.opcoes[0] ?? '')

  return (
    <RadioGroup
      value={selecionado}
      onValueChange={(v) => {
        const marcouOutro = v === OUTRO
        setOutroMarcado(marcouOutro)
        onChange(marcouOutro ? { opcoes: [], outro: atual.outro } : { opcoes: [v], outro: '' })
      }}
      disabled={desabilitada}
      aria-label={pergunta.titulo}
    >
      {pergunta.opcoes.map((op, i) => (
        <Opcao key={op} id={`${idBase}-${i}`} label={op}>
          <RadioGroupItem id={`${idBase}-${i}`} value={op} />
        </Opcao>
      ))}
      <CampoOutro
        id={`${idBase}-outro`}
        marcado={outroMarcado}
        texto={atual.outro}
        desabilitada={desabilitada}
        onTexto={(outro) => onChange({ opcoes: [], outro })}
      >
        <RadioGroupItem id={`${idBase}-outro`} value={OUTRO} />
      </CampoOutro>
    </RadioGroup>
  )
}

function MultiplaEscolha({ pergunta, idBase, valor, desabilitada, onChange }: EntradaProps) {
  const atual = comOutro(valor)
  const [outroMarcado, setOutroMarcado] = useState(atual.outro !== '')
  if (pergunta.tipo !== 'multipla_escolha') return null
  const { opcoes: todas, permiteOutro = false } = pergunta

  function emitir(opcoes: string[], outro: string) {
    // Mantém a ordem de questions.ts
    const ordenadas = todas.filter((o) => opcoes.includes(o))
    onChange(permiteOutro ? { opcoes: ordenadas, outro } : ordenadas)
  }

  return (
    <div className="flex flex-col gap-3" role="group" aria-label={pergunta.titulo}>
      {pergunta.opcoes.map((op, i) => (
        <Opcao key={op} id={`${idBase}-${i}`} label={op}>
          <Checkbox
            id={`${idBase}-${i}`}
            checked={atual.opcoes.includes(op)}
            disabled={desabilitada}
            onCheckedChange={(c) =>
              emitir(c === true ? [...atual.opcoes, op] : atual.opcoes.filter((o) => o !== op), atual.outro)
            }
          />
        </Opcao>
      ))}
      {permiteOutro && (
        <CampoOutro
          id={`${idBase}-outro`}
          marcado={outroMarcado}
          texto={atual.outro}
          desabilitada={desabilitada}
          onTexto={(outro) => emitir(atual.opcoes, outro)}
        >
          <Checkbox
            id={`${idBase}-outro`}
            checked={outroMarcado}
            disabled={desabilitada}
            onCheckedChange={(c) => {
              setOutroMarcado(c === true)
              if (c !== true) emitir(atual.opcoes, '')
            }}
          />
        </CampoOutro>
      )}
    </div>
  )
}

function CampoOutro({
  id,
  marcado,
  texto,
  desabilitada,
  onTexto,
  children,
}: {
  id: string
  marcado: boolean
  texto: string
  desabilitada: boolean
  onTexto: (texto: string) => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Opcao id={id} label="Outro">
        {children}
      </Opcao>
      {marcado && (
        <Input
          aria-label="Descreva a outra opção"
          value={texto}
          onChange={(e) => onTexto(e.target.value)}
          placeholder="Qual?"
          disabled={desabilitada}
          autoFocus
          className="ml-6.5 w-auto"
        />
      )}
    </div>
  )
}
