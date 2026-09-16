'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { purchasingPowerChange, type DailyRate } from '@/lib/finance/purchasing-power'
import { monthName } from '@/lib/notifications/finance-notices'
import { formatCurrency } from '@/lib/utils/format-currency'
import { Reveal } from './reveal'
import { DEVALUATION } from './landing-copy'

interface DevaluationSectionProps {
  /** Una cotización por mes, de más vieja a más nueva (`monthlyRates`). */
  series: DailyRate[]
  latest: DailyRate | null
}

const DEFAULT_AMOUNT = 100_000
const DEFAULT_YEARS_BACK = 5
const MAX_AMOUNT = 1_000_000_000_000

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

/** Solo dígitos, con techo: el campo no tiene por qué aceptar otra cosa. */
function parseAmount(raw: string): number {
  const digits = raw.replace(/\D/g, '')
  return Math.min(Number(digits || 0), MAX_AMOUNT)
}

const SPRING = { stiffness: 80, damping: 20, mass: 0.6 }

/**
 * "Lumus sabe que tus pesos se devalúan", con la prueba al lado.
 *
 * La calculadora usa la misma cuenta que el dashboard (`purchasingPowerChange`)
 * y la misma historia del blue: la landing no puede prometer un número que la
 * app después calcula distinto.
 */
export function DevaluationSection({ series, latest }: DevaluationSectionProps) {
  const years = [...new Set(series.map(r => r.date.slice(0, 4)))].reverse()
  const latestYear = latest ? Number(latest.date.slice(0, 4)) : new Date().getFullYear()

  const [amountText, setAmountText] = useState(DEFAULT_AMOUNT.toLocaleString('es-AR'))
  const [year, setYear] = useState(String(latestYear - DEFAULT_YEARS_BACK))
  const [month, setMonth] = useState('01')

  const amount = parseAmount(amountText)
  const period = `${year}-${month}`
  const rateThen = series.find(r => r.date.startsWith(period)) ?? null
  const change = rateThen && latest && amount > 0 ? purchasingPowerChange(amount, rateThen.usd, latest.usd) : null

  // La curva: cuántos dólares valían esos mismos pesos, mes a mes, hasta hoy.
  // Sin memo a mano: el React Compiler ya lo hace.
  const curve = rateThen && latest && amount > 0
    ? [...series.filter(r => r.date >= rateThen.date).map(r => amount / r.usd), amount / latest.usd]
    : null

  if (series.length === 0 || !latest) return null

  return (
    <section className="relative overflow-hidden px-4 py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />

      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="lumus-label text-[#cfc6ff]">{DEVALUATION.eyebrow}</p>
          <h2 className="landing-title mt-4 text-4xl font-bold text-[var(--text-primary)] sm:text-6xl">
            {DEVALUATION.title[0]}{' '}
            <span className="landing-gradient-text">{DEVALUATION.title[1]}</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">{DEVALUATION.body}</p>
        </Reveal>

        <Reveal delay={0.15} className="mx-auto mt-14 max-w-4xl">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] p-5 sm:p-8">
            <p className="text-lg font-semibold text-[var(--text-primary)] sm:text-xl">{DEVALUATION.calculator.title}</p>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-3 text-base text-[var(--text-secondary)] sm:text-lg">
              <label htmlFor="calc-amount">{DEVALUATION.calculator.amount}</label>
              <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 focus-within:border-[var(--accent-lumus)]/50">
                <span className="text-[var(--text-muted)]">$</span>
                <input
                  id="calc-amount"
                  inputMode="numeric"
                  value={amountText}
                  onChange={e => {
                    const next = parseAmount(e.target.value)
                    setAmountText(next ? next.toLocaleString('es-AR') : '')
                  }}
                  className="w-36 bg-transparent py-2 pl-1.5 font-semibold text-[var(--text-primary)] tabular-nums outline-none sm:w-44"
                />
              </div>
              <label htmlFor="calc-month">{DEVALUATION.calculator.month}</label>
              <select
                id="calc-month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-lumus)]/50"
              >
                {MONTHS.map(m => (
                  <option key={m} value={m}>{monthName(`2000-${m}`)}</option>
                ))}
              </select>
              <label htmlFor="calc-year">{DEVALUATION.calculator.year}</label>
              <select
                id="calc-year"
                value={year}
                onChange={e => setYear(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-lumus)]/50"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {change ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_1.3fr] sm:items-end">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                  <Figure label={DEVALUATION.calculator.thenLabel} value={change.usdBefore} />
                  <Figure label={DEVALUATION.calculator.nowLabel} value={change.usdNow} />
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs text-[var(--text-muted)]">
                      {change.lost ? DEVALUATION.calculator.lostLabel : DEVALUATION.calculator.gainedLabel}
                    </p>
                    <p className={`landing-display mt-1 text-5xl font-bold sm:text-6xl ${change.lost ? 'text-[#ff8a8a]' : 'text-[var(--success)]'}`}>
                      <AnimatedPercent value={Math.abs(change.percent)} />
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{DEVALUATION.calculator.ofValue}</p>
                  </div>
                </div>
                {curve && <Curve points={curve} lost={change.lost} key={period} />}
              </div>
            ) : (
              <p className="mt-8 text-sm text-[var(--text-muted)]">{DEVALUATION.calculator.empty}</p>
            )}

            <div className="mt-8 flex flex-col gap-1 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-[var(--text-primary)]">{DEVALUATION.calculator.kept}</p>
              <p className="text-xs text-[var(--text-muted)]">{DEVALUATION.calculator.source}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)] tabular-nums sm:text-3xl">
        <AnimatedNumber value={value} format={v => formatCurrency(v, 'USD', 'rounded')} />
      </p>
    </div>
  )
}

/** Un número que llega a su valor con un resorte, en vez de saltar. */
function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const motionValue = useMotionValue(value)
  const spring = useSpring(motionValue, SPRING)
  const text = useTransform(spring, format)

  useEffect(() => {
    motionValue.set(value)
  }, [motionValue, value])

  return <motion.span>{text}</motion.span>
}

function AnimatedPercent({ value }: { value: number }) {
  return <AnimatedNumber value={value} format={v => `${Math.round(v)}%`} />
}

const CURVE_W = 520
const CURVE_H = 200

/** La curva de lo que valían esos pesos en dólares. Se dibuja de izquierda a derecha. */
function Curve({ points, lost }: { points: number[]; lost: boolean }) {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * CURVE_W
    const y = CURVE_H - 12 - ((p - min) / span) * (CURVE_H - 24)
    return [x, y] as const
  })

  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${CURVE_W},${CURVE_H} L0,${CURVE_H} Z`
  const stroke = lost ? '#ff8a8a' : '#22c55e'
  const [endX, endY] = coords[coords.length - 1]

  return (
    <svg viewBox={`0 0 ${CURVE_W} ${CURVE_H}`} className="h-44 w-full overflow-visible sm:h-52" role="img" aria-label="Valor en dólares a lo largo del tiempo">
      <defs>
        <linearGradient id="curve-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill="url(#curve-fill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ type: 'spring', bounce: 0, duration: 1.6 }}
        style={{ filter: `drop-shadow(0 0 8px ${stroke}88)` }}
      />
      <motion.circle
        cx={endX}
        cy={endY}
        r={5}
        fill={stroke}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.3, duration: 0.6, delay: 1.3 }}
      />
    </svg>
  )
}
