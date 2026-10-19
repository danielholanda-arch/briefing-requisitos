import { useEffect, useRef } from 'react'

// Trechos de código que flutuam no fundo (só decoração)
const TRECHOS: { texto: string; x: number; y: number; atraso: number; duracao: number; cor: string }[] = [
  { texto: '<section class="briefing">', x: 6, y: 14, atraso: 0, duracao: 16, cor: 'text-uc-laranja' },
  { texto: 'const projeto = await criar(requisitos)', x: 58, y: 8, atraso: 3, duracao: 19, cor: 'text-white' },
  { texto: '.futuro { display: grid; gap: 2rem; }', x: 12, y: 72, atraso: 6, duracao: 17, cor: 'text-[#6FCB97]' },
  { texto: 'requisitos.filter(r => r.essencial)', x: 64, y: 62, atraso: 1.5, duracao: 21, cor: 'text-white' },
  { texto: '<input type="text" required />', x: 38, y: 88, atraso: 8, duracao: 18, cor: 'text-uc-laranja' },
  { texto: '@media (min-width: 768px) { … }', x: 72, y: 34, atraso: 10, duracao: 20, cor: 'text-[#6FCB97]' },
  { texto: 'fetch("/api/briefing", { method: "POST" })', x: 4, y: 44, atraso: 4.5, duracao: 22, cor: 'text-white' },
  { texto: ':root { --laranja: #E8611A; }', x: 44, y: 24, atraso: 12, duracao: 18, cor: 'text-uc-laranja' },
  { texto: 'export default function Projeto() {', x: 26, y: 54, atraso: 7, duracao: 20, cor: 'text-white' },
  { texto: '<button type="submit">Enviar</button>', x: 70, y: 84, atraso: 2.5, duracao: 17, cor: 'text-[#6FCB97]' },
]

const CORES = ['232, 97, 26', '232, 97, 26', '244, 165, 116', '75, 170, 117']

/** Fundo do login: rede de partículas (canvas) + trechos de HTML/CSS/JS flutuando. */
export function FundoFuturista() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="grade-futurista absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" />
      <div className="brilho-pulsante absolute -top-40 -right-32 size-[34rem] rounded-full bg-uc-laranja/25 blur-3xl" />
      <div className="brilho-pulsante absolute -bottom-48 -left-40 size-[30rem] rounded-full bg-uc-verde/25 blur-3xl [animation-delay:-4s]" />
      <RedeDeParticulas />
      {TRECHOS.map((t) => (
        <span
          key={t.texto}
          className={`codigo-flutuante absolute hidden font-mono text-xs whitespace-nowrap opacity-0 sm:block ${t.cor}`}
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            animationDelay: `${t.atraso}s`,
            animationDuration: `${t.duracao}s`,
          }}
        >
          {t.texto}
        </span>
      ))}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-uc-noite to-transparent" />
    </div>
  )
}

interface Ponto {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  cor: string
}

function RedeDeParticulas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let largura = 0
    let altura = 0
    let pontos: Ponto[] = []
    let quadro = 0

    function criarPontos() {
      const rect = canvas!.getBoundingClientRect()
      largura = rect.width
      altura = rect.height
      canvas!.width = largura * dpr
      canvas!.height = altura * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const total = Math.min(90, Math.round((largura * altura) / 16000))
      pontos = Array.from({ length: total }, () => ({
        x: Math.random() * largura,
        y: Math.random() * altura,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
        cor: CORES[Math.floor(Math.random() * CORES.length)],
      }))
    }

    function desenhar() {
      ctx!.clearRect(0, 0, largura, altura)
      const distancia = 130
      for (let i = 0; i < pontos.length; i++) {
        const a = pontos[i]
        for (let j = i + 1; j < pontos.length; j++) {
          const b = pontos[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < distancia) {
            ctx!.strokeStyle = `rgba(${a.cor}, ${(1 - d / distancia) * 0.22})`
            ctx!.lineWidth = 0.6
            ctx!.beginPath()
            ctx!.moveTo(a.x, a.y)
            ctx!.lineTo(b.x, b.y)
            ctx!.stroke()
          }
        }
      }
      for (const p of pontos) {
        ctx!.fillStyle = `rgba(${p.cor}, 0.85)`
        ctx!.shadowColor = `rgba(${p.cor}, 0.9)`
        ctx!.shadowBlur = 8
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.shadowBlur = 0
    }

    function mover() {
      for (const p of pontos) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > largura) p.vx *= -1
        if (p.y < 0 || p.y > altura) p.vy *= -1
      }
    }

    function loop() {
      mover()
      desenhar()
      quadro = requestAnimationFrame(loop)
    }

    function iniciar() {
      cancelAnimationFrame(quadro)
      if (reduzir || document.hidden) desenhar()
      else loop()
    }

    criarPontos()
    iniciar()

    const aoRedimensionar = () => {
      criarPontos()
      iniciar()
    }
    window.addEventListener('resize', aoRedimensionar)
    document.addEventListener('visibilitychange', iniciar)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('resize', aoRedimensionar)
      document.removeEventListener('visibilitychange', iniciar)
    }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 size-full" />
}
