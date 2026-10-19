import { ArchiveIcon, MessageCircleIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Questionario } from '@/data/questions'
import { formatarValor, lerValor, perguntaTratada, type Resposta } from '@/data/respostas'

/**
 * Todas as perguntas com a resposta dada (somente leitura).
 * Perguntas arquivadas só aparecem se tiverem resposta.
 */
export function ResumoRespostas({
  questionario,
  respostas,
}: {
  questionario: Questionario
  respostas: Map<string, Resposta>
}) {
  const secoes = questionario.completo
    .map((s) => ({
      ...s,
      perguntas: s.perguntas.filter((p) => p.ativa || perguntaTratada(respostas.get(p.id))),
    }))
    .filter((s) => s.perguntas.length > 0)

  return (
    <div className="flex flex-col gap-4">
      {secoes.map((secao) => (
        <Card key={secao.id} className="break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">{secao.titulo}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col divide-y divide-border">
              {secao.perguntas.map((p) => {
                const r = respostas.get(p.id)
                const texto = r ? formatarValor(p, lerValor(r.value)) : ''
                const numero = questionario.numero.get(p.id)
                return (
                  <div key={p.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                    <dt className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {numero && (
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">
                          {String(numero).padStart(2, '0')}
                        </span>
                      )}
                      {p.titulo}
                      {!p.ativa && (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <ArchiveIcon />
                          Arquivada
                        </Badge>
                      )}
                    </dt>
                    <dd className="text-sm whitespace-pre-wrap">
                      {r?.skipped ? (
                        <span className="inline-flex flex-wrap items-center gap-1.5 font-medium text-primary">
                          <MessageCircleIcon className="size-3.5" />
                          Tratar na reunião
                          {texto && (
                            <span className="font-normal text-muted-foreground">(rascunho: {texto})</span>
                          )}
                        </span>
                      ) : texto ? (
                        texto
                      ) : (
                        <span className="text-muted-foreground italic">Sem resposta</span>
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
