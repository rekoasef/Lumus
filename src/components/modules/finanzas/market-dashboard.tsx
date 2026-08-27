'use client'

import { useCallback, useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { timeAgo } from '@/lib/utils/format-date'
import type { MarketQuote, ChartPoint } from '@/lib/finance/market'
import type { CryptoQuote } from '@/lib/finance/crypto-prices'

const LABELS = {
  dollarTitle: 'Dólar blue',
  dollarSubtitle: 'Con la historia que Lumus viene guardando.',
  cryptoTitle: 'Cripto',
  cryptoSubtitle: 'Precio en dólares y variación de las últimas 24 horas.',
  stocksTitle: 'Acciones argentinas',
  stocksSubtitle: 'Las que más se movieron hoy.',
  noData: 'Sin datos: la fuente no respondió.',
  noDataHint: 'Se vuelve a intentar solo. Preferimos no mostrar un precio viejo como si fuera de ahora.',
  updated: (iso: string) => `Actualizado ${timeAgo(iso)}`,
  period: 'Período',
  disclaimer: 'Los precios son informativos y pueden estar demorados. Lumus no recomienda inversiones.',
} as const

const RANGES = [
  { days: 30,   label: '1M' },
  { days: 90,   label: '3M' },
  { days: 365,  label: '1A' },
  { days: 1825, label: '5A' },
] as const

function Change({ percent }: { percent: number }) {
  const flat = Math.abs(percent) < 0.05
  const color = flat ? 'var(--text-muted)' : percent > 0 ? '#22c55e' : '#ef4444'
  const Icon = flat ? Minus : percent > 0 ? TrendingUp : TrendingDown

  return (
    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color }}>
      <Icon size={12} />
      {percent > 0 ? '+' : ''}{percent.toFixed(2)}%
    </span>
  )
}

function EmptyBlock() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
      <AlertTriangle size={16} className="mx-auto text-[var(--warning)]" />
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{LABELS.noData}</p>
      <p className="mt-1 text-[0.68rem] text-[var(--text-muted)]">{LABELS.noDataHint}</p>
    </div>
  )
}

interface MarketDashboardProps {
  dollarHistory: ChartPoint[]
  crypto: CryptoQuote[]
  cryptoFetchedAt: string | null
  cryptoChart: ChartPoint[] | null
  cryptoChartId: string
  stocks: MarketQuote[] | null
  stocksFetchedAt: string | null
}

export function MarketDashboard({
  dollarHistory,
  crypto,
  cryptoFetchedAt,
  cryptoChart,
  cryptoChartId,
  stocks,
  stocksFetchedAt,
}: MarketDashboardProps) {
  const [days, setDays] = useState<number>(90)

  // El gráfico arranca con la que vino del server y cambia al tocar otra. La
  // serie se pide a una ruta propia, no a CoinGecko: así el caché del server
  // sigue sirviendo para todos.
  const [selectedId, setSelectedId] = useState(cryptoChartId)
  const [chart, setChart] = useState<ChartPoint[] | null>(cryptoChart)
  const [chartLoading, setChartLoading] = useState(false)

  const selectCoin = useCallback(async (id: string) => {
    if (id === selectedId) return

    setSelectedId(id)
    setChartLoading(true)

    const res = await fetch(`/api/finance/market/chart?id=${encodeURIComponent(id)}`).catch(() => null)
    const data = await res?.json().catch(() => null)

    // Si falla, se muestra el bloque vacío en vez del gráfico de la moneda
    // anterior con el nombre de la nueva.
    setChart(res?.ok ? (data.points as ChartPoint[]) : null)
    setChartLoading(false)
  }, [selectedId])

  const dollarSeries = useMemo(() => {
    const from = new Date()
    from.setDate(from.getDate() - days)
    const fromStr = from.toISOString().slice(0, 10)
    return dollarHistory.filter(p => p.date >= fromStr)
  }, [dollarHistory, days])

  const dollarChange = useMemo(() => {
    if (dollarSeries.length < 2) return null
    const first = dollarSeries[0].value
    const last = dollarSeries[dollarSeries.length - 1].value
    return first > 0 ? ((last - first) / first) * 100 : null
  }, [dollarSeries])

  const selectedCrypto = crypto.find(c => c.id === selectedId) ?? crypto[0] ?? null

  return (
    <div className="space-y-6">
      {/* ── Dólar ── */}
      <section className="lumus-glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">{LABELS.dollarTitle}</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{LABELS.dollarSubtitle}</p>
          </div>
          <div className="flex gap-1">
            {RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`rounded-lg px-2.5 py-1.5 text-[0.68rem] font-medium transition-colors ${
                  days === r.days
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                    : 'text-[var(--text-muted)] hover:bg-white/5'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {dollarSeries.length < 2 ? (
          <EmptyBlock />
        ) : (
          <>
            <div className="mt-4 flex items-end gap-3">
              <p className="text-2xl font-bold leading-none text-[var(--text-primary)]">
                {formatCurrency(dollarSeries[dollarSeries.length - 1].value, 'ARS', 'rounded')}
              </p>
              {dollarChange !== null && <Change percent={dollarChange} />}
            </div>

            <div className="mt-5 -ml-2">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dollarSeries}>
                  <defs>
                    <linearGradient id="dollarFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#bdb4ff" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#bdb4ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#7b7a88', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                    tickFormatter={d => d.slice(5)}
                  />
                  <YAxis
                    tick={{ fill: '#7b7a88', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    domain={['auto', 'auto']}
                    tickFormatter={v => Math.round(v).toLocaleString('es-AR')}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1d1b28',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#928ea0' }}
                    formatter={(v) => [formatCurrency(Number(v), 'ARS', 'rounded'), 'Blue']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#bdb4ff" strokeWidth={2} fill="url(#dollarFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      {/* ── Cripto ── */}
      <section className="lumus-glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">{LABELS.cryptoTitle}</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{LABELS.cryptoSubtitle}</p>
          </div>
          {cryptoFetchedAt && (
            <p className="text-[0.62rem] text-[var(--text-muted)]">{LABELS.updated(cryptoFetchedAt)}</p>
          )}
        </div>

        {crypto.length === 0 ? (
          <div className="mt-4"><EmptyBlock /></div>
        ) : (
          <>
            {selectedCrypto && (
              <div className="mt-5 -ml-2">
                <p className="ml-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                  {selectedCrypto.label} · últimos 30 días
                  {chartLoading && <Loader2 size={11} className="animate-spin text-[var(--text-muted)]" />}
                </p>
                {!chart || chart.length < 2 ? (
                  <div className="ml-2 mt-2"><EmptyBlock /></div>
                ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chart}>
                    <defs>
                      <linearGradient id="cryptoFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffb86e" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#ffb86e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#7b7a88', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fill: '#7b7a88', fontSize: 10 }} tickLine={false} axisLine={false} width={52} domain={['auto', 'auto']} tickFormatter={v => `${Math.round(v).toLocaleString('es-AR')}`} />
                    <Tooltip
                      contentStyle={{ background: '#1d1b28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: '#928ea0' }}
                      formatter={(v) => [`US$ ${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`, selectedCrypto.symbol]}
                    />
                    <Area type="monotone" dataKey="value" stroke="#ffb86e" strokeWidth={2} fill="url(#cryptoFill)" />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </div>
            )}

            <div className="mt-4 -mx-2 divide-y divide-white/[0.05]">
              {crypto.map(coin => (
                <button
                  key={coin.id}
                  onClick={() => selectCoin(coin.id)}
                  aria-pressed={coin.id === selectedId}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors ${
                    coin.id === selectedId ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{coin.label}</p>
                    <p className="text-[0.65rem] text-[var(--text-muted)]">{coin.symbol}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      US$ {coin.priceUsd.toLocaleString('es-AR', { maximumFractionDigits: coin.priceUsd < 10 ? 4 : 2 })}
                    </p>
                    <div className="w-[68px] text-right">
                      <Change percent={coin.changePercent} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Acciones ── */}
      <section className="lumus-glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">{LABELS.stocksTitle}</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{LABELS.stocksSubtitle}</p>
          </div>
          {stocksFetchedAt && (
            <p className="text-[0.62rem] text-[var(--text-muted)]">{LABELS.updated(stocksFetchedAt)}</p>
          )}
        </div>

        {!stocks || stocks.length === 0 ? (
          <div className="mt-4"><EmptyBlock /></div>
        ) : (
          <div className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {stocks.map(stock => (
              <div key={stock.symbol} className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-1.5">
                <p className="font-mono text-xs font-semibold text-[var(--text-primary)]">{stock.symbol}</p>
                <div className="flex items-center gap-4">
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatCurrency(stock.price, 'ARS', 'rounded')}
                  </p>
                  <div className="w-[68px] text-right">
                    <Change percent={stock.changePercent} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="px-1 text-center text-[0.65rem] leading-relaxed text-[var(--text-muted)]">
        {LABELS.disclaimer}
      </p>
    </div>
  )
}
