'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { LivingOrb } from './living-orb'
import { Reveal } from './reveal'
import { REPORT } from './landing-copy'

/** Milisegundos por carácter: rápido para no hacer esperar, lento para que se lea como escritura. */
const TYPE_SPEED_MS = 14

/**
 * El informe mensual, la feature que más vende.
 *
 * La tarjeta llega inclinada y se endereza a medida que bajás, como un
 * producto que se da vuelta para mostrarse. Adentro, el análisis se escribe
 * solo cuando la tarjeta ya se ve: escrito antes, nadie lo ve escribirse.
 */
export function ReportShowcase() {
  const ref = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })

  const rotateX = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : 22, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 1 : 0.88, 1])
  const cardY = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : 80, 0])

  return (
    <section id="informe" ref={ref} className="relative scroll-mt-20 px-4 py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-1/3 h-[40rem] bg-[radial-gradient(ellipse_at_center,rgba(124,109,250,0.12),transparent_65%)]" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <div>
          <Reveal>
            <p className="lumus-label text-[#cfc6ff]">{REPORT.eyebrow}</p>
            <h2 className="landing-title mt-4 text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">
              {REPORT.title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">{REPORT.body}</p>
          </Reveal>

          <ul className="mt-10 space-y-6">
            {REPORT.points.map((point, i) => (
              <Reveal as="li" key={point.title} delay={0.1 * i} className="flex gap-4">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--accent-lumus)] shadow-[0_0_12px_rgba(189,180,255,0.9)]" />
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{point.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{point.text}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <div className="[perspective:1400px]">
          <motion.div style={{ rotateX, scale, y: cardY }} className="origin-bottom">
            <ReportCard />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function ReportCard() {
  const { card } = REPORT
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -25% 0px' })

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.07),rgba(255,255,255,0.015))] p-5 shadow-[0_40px_120px_-40px_rgba(124,109,250,0.55)] sm:p-7"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LivingOrb size={40} interactive={false} />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{card.month}</p>
            <p className="text-xs text-[var(--text-muted)]">{card.generated}</p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.12em] text-[var(--text-muted)] uppercase">
          {card.tag}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat label={card.spent} value={card.spentValue} delta={card.spentDelta} visible={inView} delay={0.1} />
        <Stat label={card.saved} value={card.savedValue} delta={card.savedDelta} visible={inView} delay={0.2} />
      </div>

      <div className="mt-5 space-y-3">
        {card.categories.map((category, i) => (
          <div key={category.name}>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">{category.name}</span>
              <span className="font-medium text-[var(--text-primary)] tabular-nums">{category.share}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#7c6dfa] to-[#cfc6ff]"
                initial={{ width: 0 }}
                animate={inView ? { width: `${category.share * 2.4}%` } : undefined}
                transition={{ type: 'spring', bounce: 0, duration: 1.2, delay: 0.3 + i * 0.12 }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--accent-lumus)]/15 bg-[var(--accent-muted)] p-4">
        <p className="lumus-label text-[0.62rem] text-[#cfc6ff]">{card.insightTitle}</p>
        <Typewriter text={card.insight} start={inView} />
      </div>
    </div>
  )
}

interface StatProps {
  label: string
  value: string
  delta: string
  visible: boolean
  delay: number
}

function Stat({ label, value, delta, visible, delay }: StatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={visible ? { opacity: 1, y: 0 } : undefined}
      transition={{ type: 'spring', bounce: 0, duration: 0.8, delay }}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"
    >
      <p className="text-[0.7rem] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--text-primary)] tabular-nums sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-[0.7rem] text-[var(--success)]">{delta}</p>
    </motion.div>
  )
}

/**
 * Escribe el texto de a poco. Con movimiento reducido lo muestra entero: es
 * contenido, no decoración.
 *
 * El texto completo va siempre en el HTML (invisible hasta que se escribe), así
 * la tarjeta no cambia de alto mientras escribe y un lector de pantalla lo lee
 * entero desde el principio.
 */
function Typewriter({ text, start }: { text: string; start: boolean }) {
  const reduceMotion = useReducedMotion()
  const [count, setCount] = useState(0)
  const shown = reduceMotion ? text.length : count

  useEffect(() => {
    if (!start || reduceMotion) return
    const id = window.setInterval(() => {
      setCount(c => {
        if (c >= text.length) {
          window.clearInterval(id)
          return c
        }
        return c + 1
      })
    }, TYPE_SPEED_MS)
    return () => window.clearInterval(id)
  }, [start, reduceMotion, text.length])

  const done = shown >= text.length

  return (
    <p className="relative mt-2 text-sm leading-relaxed text-[var(--text-primary)]">
      <span className="sr-only">{text}</span>
      <span className="invisible" aria-hidden>{text}</span>
      <span className="absolute inset-0" aria-hidden>
        {text.slice(0, shown)}
        {!done && start && (
          <span className="landing-caret ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-[var(--accent-lumus)]" />
        )}
      </span>
    </p>
  )
}
