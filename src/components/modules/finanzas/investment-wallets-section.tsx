'use client'

import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, SlidersHorizontal, ArrowDownLeft, ArrowUpRight, ChevronDown } from 'lucide-react'
import type { Wallet } from '@/types/finance.types'
import { formatCurrency } from '@/lib/utils/format-currency'
import {
  yieldTimeline,
  type InvestmentEvent,
  type InvestmentReturn,
  type InvestmentReturnUsd,
} from '@/lib/finance/investment'

const LABELS = {
  title: 'Billeteras de inversión',
  subtitle: 'Lo que tiene saldo en vez de unidades: un plazo fijo, un FCI, la cuenta remunerada.',
  balance: 'Saldo',
  invested: 'Invertido',
  yield: 'Rendimiento',
  inUsd: 'En dólares',
  history: 'Cómo fue rindiendo',
  accumulated: 'Acumulado',
  update: 'Actualizar',
  noYields: 'Todavía no hay rendimientos registrados.',
  noYieldsHint: 'Cada vez que actualices el saldo y digas que rindió, va a aparecer un punto acá.',
  onePoint: 'Con una sola actualización todavía no hay línea que dibujar. A la próxima aparece.',
  contribution: 'Aporte',
  withdrawal: 'Retiro',
  gain: 'Ganancia',
  loss: 'Pérdida',
  showAll: 'Ver todo el historial',
  showLess: 'Ver menos',
  noWallets: 'Ninguna billetera está marcada como inversión.',
  noWalletsHint: 'En Billeteras, editá la que tenga tu plata invertida y elegí el tipo Inversión.',
} as const

/** Cuántos movimientos se muestran antes de tener que desplegar. */
const VISIBLE_EVENTS = 5

interface InvestmentWalletsSectionProps {
  wallets: Wallet[]
  events: Record<string, InvestmentEvent[]>
  returns: Record<string, { ars: InvestmentReturn; usd: InvestmentReturnUsd | null }>
  onAdjust: (wallet: Wallet) => void
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`
}

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export function InvestmentWalletsSection({ wallets, events, returns, onAdjust }: InvestmentWalletsSectionProps) {
  if (wallets.length === 0) {
    return (
      <section className="space-y-4">
        <header>
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">{LABELS.title}</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{LABELS.subtitle}</p>
        </header>
        <div className="lumus-glass rounded-2xl px-5 py-10 text-center">
          <p className="text-sm text-[var(--text-secondary)]">{LABELS.noWallets}</p>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">{LABELS.noWalletsHint}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">{LABELS.title}</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{LABELS.subtitle}</p>
      </header>

      <div className="space-y-4">
        {wallets.map(wallet => (
          <InvestmentWalletCard
            key={wallet.id}
            wallet={wallet}
            events={events[wallet.id] ?? []}
            performance={returns[wallet.id] ?? null}
            onAdjust={onAdjust}
          />
        ))}
      </div>
    </section>
  )
}

interface InvestmentWalletCardProps {
  wallet: Wallet
  events: InvestmentEvent[]
  performance: { ars: InvestmentReturn; usd: InvestmentReturnUsd | null } | null
  onAdjust: (wallet: Wallet) => void
}

function InvestmentWalletCard({ wallet, events, performance, onAdjust }: InvestmentWalletCardProps) {
  const [expanded, setExpanded] = useState(false)

  const timeline = useMemo(() => yieldTimeline(events), [events])

  // Del más nuevo al más viejo: lo último que pasó es lo que se quiere ver.
  const history = useMemo(
    () => [...events].sort((a, b) => b.date.localeCompare(a.date)),
    [events],
  )

  const money = (value: number) => formatCurrency(value, wallet.currency, 'rounded')
  const positive = (performance?.ars.returnArs ?? 0) >= 0

  return (
    <div className="lumus-glass rounded-2xl p-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${wallet.color}22`, color: wallet.color }}
          >
            <TrendingUp size={17} />
          </div>
          <div>
            <p className="lumus-heading text-sm font-semibold text-[var(--text-primary)]">{wallet.name}</p>
            <p className="lumus-label mt-0.5 text-[0.6rem] text-[var(--text-muted)]">
              {LABELS.balance} {formatCurrency(wallet.balance, wallet.currency, 'exact')}
            </p>
          </div>
        </div>

        <button
          onClick={() => onAdjust(wallet)}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-[0.7rem] font-medium text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]"
        >
          <SlidersHorizontal size={12} /> {LABELS.update}
        </button>
      </div>

      {/* Los tres números que importan */}
      {performance && (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{LABELS.yield}</p>
            <p
              className="lumus-heading mt-1.5 text-xl font-bold leading-tight"
              style={{ color: positive ? '#22c55e' : '#ef4444' }}
            >
              {performance.ars.returnArs > 0 ? '+' : performance.ars.returnArs < 0 ? '−' : ''}
              {money(Math.abs(performance.ars.returnArs))}
            </p>
            {performance.ars.percent !== null && (
              <p className="mt-0.5 text-[0.68rem] text-[var(--text-muted)]">
                {formatPercent(performance.ars.percent)} sobre lo invertido
              </p>
            )}
          </div>

          {performance.usd && (
            <div>
              <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{LABELS.inUsd}</p>
              <p
                className="lumus-heading mt-1.5 text-xl font-bold leading-tight"
                style={{ color: performance.usd.returnUsd >= 0 ? '#22c55e' : '#ef4444' }}
              >
                {performance.usd.returnUsd > 0 ? '+' : performance.usd.returnUsd < 0 ? '−' : ''}
                {formatCurrency(Math.abs(performance.usd.returnUsd), 'USD', 'rounded')}
              </p>
              {performance.usd.percent !== null && (
                <p className="mt-0.5 text-[0.68rem] text-[var(--text-muted)]">
                  {formatPercent(performance.usd.percent)} en dólares
                </p>
              )}
            </div>
          )}

          <div>
            <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{LABELS.invested}</p>
            <p className="lumus-heading mt-1.5 text-xl font-bold leading-tight text-[var(--text-primary)]">
              {money(performance.ars.investedArs)}
            </p>
            <p className="mt-0.5 text-[0.68rem] text-[var(--text-muted)]">
              desde {formatDay(wallet.investment_baseline_date ?? '')}
            </p>
          </div>
        </div>
      )}

      {/* ── Cómo fue rindiendo ── */}
      <div className="mt-5 border-t border-white/[0.07] pt-4">
        <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{LABELS.history}</p>

        {timeline.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
            <p className="text-xs text-[var(--text-secondary)]">{LABELS.noYields}</p>
            <p className="mt-1 text-[0.68rem] text-[var(--text-muted)]">{LABELS.noYieldsHint}</p>
          </div>
        ) : timeline.length === 1 ? (
          <div className="mt-3 flex items-baseline justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <span className="text-[0.7rem] text-[var(--text-muted)]">{LABELS.onePoint}</span>
            <span
              className="lumus-heading shrink-0 text-sm font-bold"
              style={{ color: timeline[0].accumulated >= 0 ? '#22c55e' : '#ef4444' }}
            >
              {timeline[0].accumulated > 0 ? '+' : timeline[0].accumulated < 0 ? '−' : ''}
              {money(Math.abs(timeline[0].accumulated))}
            </span>
          </div>
        ) : (
          <div className="mt-3 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id={`yieldFill-${wallet.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={positive ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={positive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#7b7a88', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                  tickFormatter={formatDay}
                />
                <YAxis
                  tick={{ fill: '#7b7a88', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  domain={['auto', 'auto']}
                  tickFormatter={v => Math.round(Number(v)).toLocaleString('es-AR')}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1d1b28',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#928ea0' }}
                  labelFormatter={label => formatDay(String(label))}
                  formatter={(value) => [money(Number(value)), LABELS.accumulated]}
                />
                <Area
                  type="monotone"
                  dataKey="accumulated"
                  stroke={positive ? '#22c55e' : '#ef4444'}
                  strokeWidth={2}
                  fill={`url(#yieldFill-${wallet.id})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* El detalle, movimiento por movimiento */}
      {history.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {(expanded ? history : history.slice(0, VISIBLE_EVENTS)).map((event, index) => {
            const isYield = event.kind === 'rendimiento'
            const negative = event.amount < 0
            const color = isYield ? (negative ? '#ef4444' : '#22c55e') : 'var(--text-secondary)'
            const label = isYield
              ? (negative ? LABELS.loss : LABELS.gain)
              : (negative ? LABELS.withdrawal : LABELS.contribution)

            return (
              <div
                key={`${event.date}-${event.kind}-${index}`}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]"
              >
                <span style={{ color }}>
                  {isYield
                    ? (negative ? <TrendingDown size={13} /> : <TrendingUp size={13} />)
                    : (negative ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />)}
                </span>
                <span className="text-[0.7rem] text-[var(--text-secondary)]">{label}</span>
                <span className="flex-1 text-right text-[0.7rem] font-semibold" style={{ color }}>
                  {event.amount > 0 ? '+' : '−'}{money(Math.abs(event.amount))}
                </span>
                <span className="lumus-label w-14 shrink-0 text-right text-[0.6rem] text-[var(--text-muted)]">
                  {formatDay(event.date)}
                </span>
              </div>
            )
          })}

          {history.length > VISIBLE_EVENTS && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex w-full items-center justify-center gap-1 pt-1 text-[0.68rem] text-[var(--accent-lumus)] hover:underline"
            >
              {expanded ? LABELS.showLess : LABELS.showAll}
              <ChevronDown size={12} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
