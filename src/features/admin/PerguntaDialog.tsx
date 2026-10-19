import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { EyeIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ROTULO_TIPO, type Pergunta, type Secao, type TipoPergunta } from '@/data/questions'
import { chaves } from '@/features/questionario/api'
import { QuestionField } from '@/features/questionario/QuestionField'
import { chavesAdmin, gerarId, salvarPergunta, type NovaPergunta } from './api'

interface Rascunho {
  secaoId: string
  tipo: TipoPergunta
  titulo: string
  ajuda: string
  placeholder: string
  obrigatoria: boolean
  opcoes: string
  permiteOutro: boolean
  escalaMin: string
  escalaMax: string
  rotuloMin: string
  rotuloMax: string
}

function rascunhoDe(p: Pergunta | undefined, secaoId: string): Rascunho {
  return {
    secaoId: p?.secaoId ?? secaoId,
    tipo: p?.tipo ?? 'texto_longo',
    titulo: p?.titulo ?? '',
    ajuda: p?.ajuda ?? '',
    placeholder: p && (p.tipo === 'texto' || p.tipo === 'texto_longo') ? (p.placeholder ?? '') : '',
    obrigatoria: p?.obrigatoria ?? false,
    opcoes: p && (p.tipo === 'escolha_unica' || p.tipo === 'multipla_escolha') ? p.opcoes.join('\n') : '',
    permiteOutro: p && (p.tipo === 'escolha_unica' || p.tipo === 'multipla_escolha') ? p.permiteOutro : false,
    escalaMin: p?.tipo === 'escala' ? String(p.min) : '1',
    escalaMax: p?.tipo === 'escala' ? String(p.max) : '5',
    rotuloMin: p?.tipo === 'escala' ? p.rotuloMin : '',
    rotuloMax: p?.tipo === 'escala' ? p.rotuloMax : '',
  }
}

function listaDeOpcoes(texto: string): string[] {
  return [...new Set(texto.split('\n').map((o) => o.trim()).filter(Boolean))]
}

function validar(r: Rascunho): string | null {
  if (!r.titulo.trim()) return 'Escreva a pergunta.'
  if ((r.tipo === 'escolha_unica' || r.tipo === 'multipla_escolha') && listaDeOpcoes(r.opcoes).length === 0) {
    return 'Informe pelo menos uma opção (uma por linha).'
  }
  if (r.tipo === 'escala') {
    const min = Number(r.escalaMin)
    const max = Number(r.escalaMax)
    if (!Number.isInteger(min) || !Number.isInteger(max)) return 'A escala precisa de números inteiros.'
    if (max <= min) return 'O máximo da escala precisa ser maior que o mínimo.'
    if (max - min > 10) return 'A escala pode ter no máximo 11 pontos.'
  }
  return null
}

function paraPergunta(r: Rascunho, id: string): Pergunta {
  const base = {
    id,
    secaoId: r.secaoId,
    titulo: r.titulo || 'Sua pergunta aparece aqui',
    ajuda: r.ajuda || undefined,
    obrigatoria: r.obrigatoria,
    ativa: true,
    ordem: 0,
  }
  switch (r.tipo) {
    case 'texto':
    case 'texto_longo':
      return { ...base, tipo: r.tipo, placeholder: r.placeholder || undefined }
    case 'escolha_unica':
    case 'multipla_escolha':
      return { ...base, tipo: r.tipo, opcoes: listaDeOpcoes(r.opcoes), permiteOutro: r.permiteOutro }
    case 'escala':
      return {
        ...base,
        tipo: 'escala',
        min: Number(r.escalaMin) || 1,
        max: Math.max(Number(r.escalaMax) || 5, (Number(r.escalaMin) || 1) + 1),
        rotuloMin: r.rotuloMin,
        rotuloMax: r.rotuloMax,
      }
    case 'arquivos':
      return { ...base, tipo: 'arquivos' }
  }
}

interface Props {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
  secoes: Secao[]
  /** Seção em que a pergunta nova entra */
  secaoId: string
  /** Sem pergunta: cria uma nova */
  pergunta?: Pergunta
  /** Quantos projetos já responderam (trava a troca de tipo) */
  respostas: number
  proximaOrdem: number
}

export function PerguntaDialog({
  aberto,
  onAbertoChange,
  secoes,
  secaoId,
  pergunta,
  respostas,
  proximaOrdem,
}: Props) {
  const queryClient = useQueryClient()
  const [r, setR] = useState(() => rascunhoDe(pergunta, secaoId))
  const [abertoAntes, setAbertoAntes] = useState(aberto)
  const [tentou, setTentou] = useState(false)
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto)
    if (aberto) {
      setR(rascunhoDe(pergunta, secaoId))
      setTentou(false)
    }
  }

  const erro = validar(r)
  const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => setR((atual) => ({ ...atual, [k]: v }))

  const salvar = useMutation({
    mutationFn: () => {
      const linha: NovaPergunta = {
        id: pergunta?.id ?? gerarId('p'),
        secao_id: r.secaoId,
        tipo: r.tipo,
        titulo: r.titulo.trim(),
        ajuda: r.ajuda.trim() || null,
        placeholder: r.tipo === 'texto' || r.tipo === 'texto_longo' ? r.placeholder.trim() || null : null,
        obrigatoria: r.obrigatoria,
        opcoes: r.tipo === 'escolha_unica' || r.tipo === 'multipla_escolha' ? listaDeOpcoes(r.opcoes) : [],
        permite_outro: (r.tipo === 'escolha_unica' || r.tipo === 'multipla_escolha') && r.permiteOutro,
        escala_min: r.tipo === 'escala' ? Number(r.escalaMin) : null,
        escala_max: r.tipo === 'escala' ? Number(r.escalaMax) : null,
        rotulo_min: r.tipo === 'escala' ? r.rotuloMin.trim() || null : null,
        rotulo_max: r.tipo === 'escala' ? r.rotuloMax.trim() || null : null,
        // Ao mudar de seção, vai para o fim da nova seção
        ordem: pergunta && pergunta.secaoId === r.secaoId ? pergunta.ordem : proximaOrdem,
        ativa: pergunta?.ativa ?? true,
      }
      return salvarPergunta(linha)
    },
    onSuccess: async () => {
      toast.success(pergunta ? 'Pergunta atualizada' : 'Pergunta criada')
      onAbertoChange(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chaves.catalogo }),
        queryClient.invalidateQueries({ queryKey: chavesAdmin.contagemRespostas }),
      ])
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (!erro) salvar.mutate()
  }

  const ehEscolha = r.tipo === 'escolha_unica' || r.tipo === 'multipla_escolha'
  const previa = paraPergunta(r, pergunta?.id ?? 'previa')

  return (
    <Dialog open={aberto} onOpenChange={(a) => !salvar.isPending && onAbertoChange(a)}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{pergunta ? 'Editar pergunta' : 'Nova pergunta'}</DialogTitle>
            <DialogDescription>Texto da pergunta e forma de resposta.</DialogDescription>
          </DialogHeader>

          {respostas > 0 && (
            <Alert>
              <TriangleAlertIcon />
              <AlertDescription>
                {respostas} projeto(s) já responderam esta pergunta. O tipo de resposta não pode mudar. Ajustar
                o texto é seguro; para mudar o sentido, arquive esta e crie outra.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-5 md:grid-cols-[1fr_0.9fr]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-titulo">Pergunta *</Label>
                <Textarea
                  id="p-titulo"
                  value={r.titulo}
                  onChange={(e) => set('titulo', e.target.value)}
                  rows={2}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-ajuda">Texto de ajuda</Label>
                <Input
                  id="p-ajuda"
                  value={r.ajuda}
                  onChange={(e) => set('ajuda', e.target.value)}
                  placeholder="Opcional: aparece abaixo da pergunta"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Tipo de resposta</Label>
                  <Select
                    value={r.tipo}
                    onValueChange={(v) => set('tipo', v as TipoPergunta)}
                    disabled={respostas > 0}
                  >
                    <SelectTrigger className="w-full" aria-label="Tipo de resposta">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROTULO_TIPO) as TipoPergunta[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {ROTULO_TIPO[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Seção</Label>
                  <Select value={r.secaoId} onValueChange={(v) => set('secaoId', v)}>
                    <SelectTrigger className="w-full" aria-label="Seção">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {secoes.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(r.tipo === 'texto' || r.tipo === 'texto_longo') && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-placeholder">Exemplo dentro do campo</Label>
                  <Input
                    id="p-placeholder"
                    value={r.placeholder}
                    onChange={(e) => set('placeholder', e.target.value)}
                    placeholder="Ex.: pequenas clínicas da região"
                  />
                </div>
              )}

              {ehEscolha && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="p-opcoes">Opções * (uma por linha)</Label>
                    <Textarea
                      id="p-opcoes"
                      value={r.opcoes}
                      onChange={(e) => set('opcoes', e.target.value)}
                      rows={5}
                      placeholder={'Opção 1\nOpção 2\nOpção 3'}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="p-outro"
                      checked={r.permiteOutro}
                      onCheckedChange={(c) => set('permiteOutro', c === true)}
                    />
                    <Label htmlFor="p-outro" className="font-normal">
                      Permitir "Outro" com texto livre
                    </Label>
                  </div>
                </>
              )}

              {r.tipo === 'escala' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="p-min">De</Label>
                    <Input id="p-min" type="number" value={r.escalaMin} onChange={(e) => set('escalaMin', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="p-max">Até</Label>
                    <Input id="p-max" type="number" value={r.escalaMax} onChange={(e) => set('escalaMax', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="p-rmin">Rótulo do início</Label>
                    <Input
                      id="p-rmin"
                      value={r.rotuloMin}
                      onChange={(e) => set('rotuloMin', e.target.value)}
                      placeholder="Ex.: Pode esperar"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="p-rmax">Rótulo do fim</Label>
                    <Input
                      id="p-rmax"
                      value={r.rotuloMax}
                      onChange={(e) => set('rotuloMax', e.target.value)}
                      placeholder="Ex.: Muito urgente"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="p-obrigatoria"
                  checked={r.obrigatoria}
                  onCheckedChange={(c) => set('obrigatoria', c === true)}
                />
                <Label htmlFor="p-obrigatoria" className="font-normal">
                  Obrigatória
                </Label>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 font-mono text-xs tracking-[0.15em] text-muted-foreground uppercase">
                <EyeIcon className="size-3.5" />
                Pré-visualização
              </p>
              <div className="rounded-xl border border-dashed bg-background/60 p-4">
                <QuestionField
                  // Recria a prévia quando a configuração muda
                  key={JSON.stringify(previa)}
                  pergunta={previa}
                  numero={1}
                  resposta={undefined}
                  salvar={async () => {}}
                  onAlterar={() => {}}
                  previa
                />
              </div>
            </div>
          </div>

          {tentou && erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
          {salvar.error && (
            <Alert variant="destructive">
              <AlertDescription>{salvar.error.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onAbertoChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending && <Loader2Icon className="animate-spin" />}
              {pergunta ? 'Salvar alterações' : 'Criar pergunta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
