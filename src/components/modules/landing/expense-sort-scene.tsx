'use client'

import { useEffect, useRef, useState } from 'react'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { Bus, Coffee, Fuel, Pill, ShoppingCart, Tv, UtensilsCrossed, Zap, type LucideIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { LivingOrb } from './living-orb'
import { SORT_SCENE } from './landing-copy'

const ICONS: Record<string, LucideIcon> = {
  super: ShoppingCart,
  fuel: Fuel,
  food: UtensilsCrossed,
  coffee: Coffee,
  power: Zap,
  streaming: Tv,
  pharmacy: Pill,
  transport: Bus,
}

/**
 * Dónde arranca cada gasto, como fracción de la pantalla desde el centro, y
 * cuánto está girado. A mano y no al azar: el desorden tiene que verse
 * desordenado sin tapar el título, y igual en el servidor y en el navegador.
 */
const SCATTER = [
  { fx: -0.34, fy: -0.3, rot: -9 },
  { fx: 0.3, fy: -0.27, rot: 7 },
  { fx: -0.4, fy: 0.02, rot: 5 },
  { fx: 0.38, fy: 0.06, rot: -6 },
  { fx: -0.26, fy: 0.3, rot: -4 },
  { fx: 0.24, fy: 0.33, rot: 8 },
  { fx: -0.02, fy: -0.38, rot: 3 },
  { fx: 0.04, fy: 0.42, rot: -7 },
]

// Geometría de la tarjeta ordenada, en px.
const CHIP_W = 280
const ROW_H = 40
const ROW_GAP = 6
const CARD_HEAD = 84
const CARD_FOOT = 72
const CARD_PAD = 16

/** Tamaño de pantalla y alto del título antes de medir (servidor y primer cuadro). */
const FALLBACK = { w: 1280, h: 800, head: 60 }

/** Lo que ocupa la barra de navegación fija, más un respiro. */
const NAV_SPACE = 72
/** Entre el título y la tarjeta. */
const HEAD_GAP = 28

/** Cuánto antes arranca cada gasto que el siguiente: llegan de a uno, no en bloque. */
const STAGGER = 0.025

/**
 * Lo que dura la escena entera, en segundos. Todas las etapas de abajo son
 * fracciones de esto.
 */
const SCENE_DURATION = 2.8
/**
 * Arranca lento y aterriza suave. Con una curva que arranca rápido, el desorden
 * del principio casi no llegaba a verse, y sin él la escena no cuenta nada.
 */
const SCENE_EASE = [0.65, 0, 0.35, 1] as const

/**
 * Gastos sueltos por la pantalla que vuelan a su lugar y forman una lista
 * ordenada junto al orbe. Es la promesa de Lumus contada sin palabras: vos
 * anotás, Lumus ordena.
 *
 * Ocupa una pantalla y se reproduce sola, entera, cuando la sección queda a la
 * vista. La primera versión avanzaba con el scroll y pedía más de tres
 * pantallas para terminar: los testers sintieron que era demasiado scroll para
 * una sola idea (2026-09-17). Con movimiento reducido se muestra ordenada.
 */
export function ExpenseSortScene() {
  const ref = useRef<HTMLElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const [viewport, setViewport] = useState(FALLBACK)
  // Arranca cuando se ve más de la mitad: antes, la animación pasaría a
  // medias fuera de pantalla.
  const inView = useInView(ref, { once: true, amount: 0.55 })
  const progress = useMotionValue(0)

  useEffect(() => {
    if (!inView) return
    if (reduceMotion) {
      progress.set(1)
      return
    }
    const controls = animate(progress, 1, { duration: SCENE_DURATION, ease: SCENE_EASE })
    return () => controls.stop()
  }, [inView, reduceMotion, progress])

  useEffect(() => {
    // El título final ocupa una línea en escritorio y dos en el celular: se
    // mide para que la tarjeta no lo empuje debajo de la barra.
    function measure() {
      setViewport({
        w: window.innerWidth,
        h: window.innerHeight,
        head: headRef.current?.offsetHeight ?? FALLBACK.head,
      })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const { w, h, head } = viewport
  const count = SORT_SCENE.expenses.length
  const cardH = CARD_HEAD + count * ROW_H + (count - 1) * ROW_GAP + CARD_FOOT

  // Al final, título y tarjeta forman un bloque centrado debajo de la barra. En
  // pantallas bajas la tarjeta se achica para que entre entera.
  const room = h - NAV_SPACE - head - HEAD_GAP - 24
  const scale = Math.min(1, room / cardH)
  const blockH = head + HEAD_GAP + cardH * scale
  const blockTop = NAV_SPACE + Math.max(0, (h - NAV_SPACE - blockH) / 2)
  // Posiciones medidas desde el centro de la pantalla, en px de pantalla.
  const headingFinalY = blockTop + head / 2 - h / 2
  const cardTopScreen = blockTop + head + HEAD_GAP - h / 2
  // El escenario está escalado: sus coordenadas internas van sin escalar.
  const cardTop = cardTopScreen / scale

  const headingY = useTransform(progress, [0.12, 0.55], [0, headingFinalY])
  const beforeOpacity = useTransform(progress, [0.4, 0.52], [1, 0])
  const afterOpacity = useTransform(progress, [0.5, 0.62], [0, 1])
  const cardOpacity = useTransform(progress, [0.45, 0.62], [0, 1])
  const cardScale = useTransform(progress, [0.45, 0.62], [0.94, 1])
  const footOpacity = useTransform(progress, [0.66, 0.78], [0, 1])
  const footY = useTransform(progress, [0.66, 0.78], [10, 0])

  const total = SORT_SCENE.expenses.reduce((sum, e) => sum + e.amount, 0)
  // Ordenar es literal: cada gasto termina en el puesto que le da su monto.
  const rankByKey = new Map(
    [...SORT_SCENE.expenses].sort((a, b) => b.amount - a.amount).map((e, rank) => [e.key, rank]),
  )

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[600px]">
      <div className="relative h-full overflow-clip">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,109,250,0.10),transparent_60%)]" aria-hidden />

        {/* Título: arranca en el centro, entre los gastos, y sube a su lugar. */}
        <motion.div
          style={{ y: headingY }}
          className="absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 px-4 text-center"
        >
          <div ref={headRef} className="relative mx-auto grid max-w-3xl">
            <motion.h2
              style={{ opacity: beforeOpacity }}
              className="landing-title col-start-1 row-start-1 text-4xl font-bold text-[var(--text-primary)] sm:text-6xl"
            >
              {SORT_SCENE.before}
            </motion.h2>
            <motion.p
              style={{ opacity: afterOpacity }}
              className="landing-title col-start-1 row-start-1 text-3xl font-bold sm:text-5xl"
              aria-hidden
            >
              <span className="landing-gradient-text">{SORT_SCENE.after[0]}</span>{' '}
              <span className="text-[var(--text-primary)]">{SORT_SCENE.after[1]}</span>
            </motion.p>
          </div>
        </motion.div>

        {/* El escenario: todo se mide desde el centro de la pantalla. */}
        <div className="absolute top-1/2 left-1/2 size-0" style={{ transform: `scale(${scale})` }}>
          {/* La tarjeta que aparece detrás de los gastos ya ordenados */}
          <motion.div
            style={{
              opacity: cardOpacity,
              scale: cardScale,
              top: cardTop,
              left: -(CHIP_W / 2 + CARD_PAD),
              width: CHIP_W + CARD_PAD * 2,
              height: cardH,
            }}
            className="absolute rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.07),rgba(255,255,255,0.015))] shadow-[0_40px_120px_-40px_rgba(124,109,250,0.6)]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />
            <div className="flex items-center gap-3 px-4 pt-4">
              <LivingOrb size={44} interactive={false} />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{SORT_SCENE.cardTitle}</p>
                <p className="text-xs text-[var(--accent-lumus)]">{SORT_SCENE.cardTag}</p>
              </div>
            </div>

            <motion.div
              style={{ opacity: footOpacity, y: footY }}
              className="absolute inset-x-4 bottom-4 border-t border-white/[0.08] pt-3"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[var(--text-muted)]">{SORT_SCENE.total}</span>
                <span className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                  {formatCurrency(total, 'ARS', 'rounded')}
                </span>
              </div>
              <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">{SORT_SCENE.topCategory}</p>
            </motion.div>
          </motion.div>

          {SORT_SCENE.expenses.map((expense, i) => (
            <ExpenseChip
              key={expense.key}
              progress={progress}
              icon={ICONS[expense.key] ?? ShoppingCart}
              name={expense.name}
              amount={formatCurrency(expense.amount, 'ARS', 'rounded')}
              from={{
                x: (SCATTER[i].fx * w) / scale - CHIP_W / 2,
                y: (SCATTER[i].fy * h) / scale - ROW_H / 2,
                rotate: SCATTER[i].rot,
              }}
              to={{
                x: -CHIP_W / 2,
                y: cardTop + CARD_HEAD + (rankByKey.get(expense.key) ?? i) * (ROW_H + ROW_GAP),
              }}
              range={[0.12 + i * STAGGER, 0.5 + i * STAGGER]}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

interface ExpenseChipProps {
  progress: MotionValue<number>
  icon: LucideIcon
  name: string
  amount: string
  from: { x: number; y: number; rotate: number }
  to: { x: number; y: number }
  range: [number, number]
}

function ExpenseChip({ progress, icon: Icon, name, amount, from, to, range }: ExpenseChipProps) {
  const x = useTransform(progress, range, [from.x, to.x])
  const y = useTransform(progress, range, [from.y, to.y])
  const rotate = useTransform(progress, range, [from.rotate, 0])
  const blur = useTransform(progress, [0, range[0], range[1]], [1, 1, 0])
  const filter = useTransform(blur, v => `blur(${v}px)`)
  const opacity = useTransform(progress, [0, 0.06], [0.75, 1])

  return (
    <motion.div
      style={{ x, y, rotate, filter, opacity, width: CHIP_W, height: ROW_H }}
      className="absolute top-0 left-0 z-10 flex items-center gap-2.5 rounded-xl border border-white/[0.09] bg-[#16151f]/90 px-2.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.8)]"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent-lumus)]">
        <Icon className="size-3.5" strokeWidth={2} />
      </span>
      <span className="flex-1 truncate text-sm text-[var(--text-primary)]">{name}</span>
      <span className="text-sm font-medium text-[var(--text-secondary)] tabular-nums">{amount}</span>
    </motion.div>
  )
}
