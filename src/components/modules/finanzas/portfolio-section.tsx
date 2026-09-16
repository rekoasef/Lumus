'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Plus, SlidersHorizontal, Trash2, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/components/shared/confirm-dialog'
import { usePortfolio } from '@/hooks/use-portfolio'
import { convertToARS, type ExchangeRates } from '@/lib/finance/exchange-rates'
import {
  averagePrice,
  portfolioWalletSummary,
  quoteCurrencyOf,
  valueHoldings,
  type Holding,
  type HoldingKind,
  type HoldingTrade,
  type PriceQuotes,
  type ValuedHolding,
} from '@/lib/finance/holdings'
import type { DailyRate } from '@/lib/finance/purchasing-power'
import type { CreatePurchaseInput } from '@/lib/validations/finance'
import { formatCurrency } from '@/lib/utils/format-currency'
import { formatDate, timeAgo } from '@/lib/utils/format-date'
import type { Wallet } from '@/types/finance.types'
import { PurchaseForm } from './purchase-form'

const LABELS = {
  title: 'Carteras',
  subtitle: 'Un broker o un exchange: cada acción, CEDEAR o cripto que tenés adentro, al precio de hoy.',
  emptyTitle: 'Todavía no tenés ninguna cartera.',
  emptyHint: 'Creá una billetera para tu broker o exchange y cargá adentro lo que compraste.',
  create: 'Crear cartera',
  add: 'Agregar compra',
  adjustCash: 'Ajustar efectivo',
  total: 'Vale hoy',
  cash: 'Efectivo',
  performance: 'Rendimiento en dólares',
  noReturn: 'Sin costo comparable',
  inPesos: 'en pesos',
  emptyWallet: 'Todavía no cargaste nada en esta cartera.',
  emptyWalletHint: 'Agregá tu primera compra y el precio se busca solo.',
  quantity: 'Cantidad',
  average: 'Promedio',
  price: 'Precio hoy',
  noPrice: 'Sin precio',
  manual: 'manual',
  trades: 'Compras',
  removeTrade: 'Borrar compra',
  removeHolding: 'Sacar de la cartera',
  confirmTrade: 'Se borra esta compra y la posición se recalcula. Si era la única, la especie sale de la cartera.',
  confirmHolding: (name: string) => `Se saca ${name} de la cartera con todas sus compras.`,
  unpriced: (n: number) => `${n} sin precio: no suman al total`,
  pricesAge: (ago: string) => `Precios de ${ago} · data912 y CoinGecko`,
  disclaimer: 'Informativo. Lumus muestra cómo viene cada especie; no recomienda comprar ni vender.',
} as const

const KIND_LABELS: Record<HoldingKind, string> = {
  accion: 'Acción',
  cedear: 'CEDEAR',
  cripto: 'Cripto',
  otro: 'Otro',
}

function signed(value: number, text: string): string {
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${text}`
}

function percent(value: number): string {
  return signed(value, `${Math.abs(value).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`)
}

function quantityText(value: number): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: 8 })
}

function tone(value: number): string {
  return value > 0 ? 'text-[var(--success)]' : value < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'
}

interface PortfolioSectionProps {
  wallets: Wallet[]
  holdings: Holding[]
  trades: HoldingTrade[]
  quotes: PriceQuotes
  quotesFetchedAt: string | null
  rates: ExchangeRates
  rateHistory: DailyRate[]
  onCreatePortfolio: () => void
  onAdjustCash: (wallet: Wallet) => void
}

export function PortfolioSection({
  wallets, holdings, trades, quotes, quotesFetchedAt, rates, rateHistory, onCreatePortfolio, onAdjustCash,
}: PortfolioSectionProps) {
  const portfolio = usePortfolio()
  const [buyingFor, setBuyingFor] = useState<Wallet | null>(null)

  const valued = useMemo(
    () => valueHoldings(holdings, trades, quotes, rates.USD, rateHistory),
    [holdings, trades, quotes, rates.USD, rateHistory],
  )

  async function handlePurchase(input: CreatePurchaseInput): Promise<boolean> {
    try {
      await portfolio.addPurchase(input)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar la compra')
      return false
    }
    setBuyingFor(null)
    toast.success('Compra agregada')
    return true
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">{LABELS.title}</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{LABELS.subtitle}</p>
        </div>
        {wallets.length > 0 && (
          <button
            onClick={onCreatePortfolio}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-white/20 hover:text-[var(--text-primary)]"
          >
            <Plus size={13} /> {LABELS.create}
          </button>
        )}
      </header>

      {wallets.length === 0 ? (
        <div className="lumus-glass rounded-2xl px-5 py-10 text-center">
          <Briefcase className="mx-auto mb-3 text-[var(--accent-lumus)]" size={24} />
          <p className="text-sm text-[var(--text-secondary)]">{LABELS.emptyTitle}</p>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">{LABELS.emptyHint}</p>
          <button
            onClick={onCreatePortfolio}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            <Plus size={14} /> {LABELS.create}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {wallets.map(wallet => (
            <PortfolioCard
              key={wallet.id}
              wallet={wallet}
              positions={valued.filter(v => v.holding.wallet_id === wallet.id)}
              trades={trades}
              cashArs={convertToARS(wallet.balance, wallet.currency, rates)}
              portfolio={portfolio}
              onBuy={() => setBuyingFor(wallet)}
              onAdjustCash={() => onAdjustCash(wallet)}
            />
          ))}
          <div className="space-y-1 px-1 text-[0.65rem] text-[var(--text-muted)]">
            {quotesFetchedAt && <p>{LABELS.pricesAge(timeAgo(quotesFetchedAt))}</p>}
            <p>{LABELS.disclaimer}</p>
          </div>
        </div>
      )}

      {buyingFor && (
        <PurchaseForm
          wallet={buyingFor}
          saving={portfolio.pending === 'purchase'}
          onSave={handlePurchase}
          onClose={() => setBuyingFor(null)}
        />
      )}
    </section>
  )
}

interface PortfolioCardProps {
  wallet: Wallet
  positions: ValuedHolding[]
  trades: HoldingTrade[]
  cashArs: number
  portfolio: ReturnType<typeof usePortfolio>
  onBuy: () => void
  onAdjustCash: () => void
}

function PortfolioCard({ wallet, positions, trades, cashArs, portfolio, onBuy, onAdjustCash }: PortfolioCardProps) {
  const [open, setOpen] = useState<string | null>(null)
  const summary = portfolioWalletSummary(positions, cashArs)

  async function removeTrade(id: string) {
    if (!(await confirm({ title: LABELS.removeTrade, description: LABELS.confirmTrade, variant: 'danger', confirmLabel: 'Borrar' }))) return
    try {
      await portfolio.removeTrade(id)
      toast.success('Compra borrada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo borrar')
    }
  }

  async function removeHolding(holding: Holding) {
    if (!(await confirm({ title: LABELS.removeHolding, description: LABELS.confirmHolding(holding.name), variant: 'danger', confirmLabel: 'Sacar' }))) return
    try {
      await portfolio.removeHolding(holding.id)
      toast.success(`${holding.name} salió de la cartera`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo sacar')
    }
  }

  return (
    <article className="lumus-glass overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="flex items-center gap-2.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: wallet.color, boxShadow: `0 0 10px ${wallet.color}66` }} />
          <h3 className="lumus-heading text-base font-semibold text-[var(--text-primary)]">{wallet.name}</h3>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onAdjustCash}
            title={LABELS.adjustCash}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[0.7rem] text-[var(--text-muted)] transition-colors hover:border-white/20 hover:text-[var(--text-secondary)]"
          >
            <SlidersHorizontal size={12} /> <span className="hidden sm:inline">{LABELS.adjustCash}</span>
          </button>
          <button
            onClick={onBuy}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-lumus)] px-3 py-1.5 text-[0.7rem] font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            <Plus size={13} /> {LABELS.add}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-y border-white/[0.06] bg-white/[0.015] px-5 py-4">
        <div>
          <p className="lumus-label text-[0.56rem] text-[var(--text-muted)]">{LABELS.total}</p>
          <p className="mt-1.5 text-xl font-bold leading-tight tabular-nums text-[var(--text-primary)] sm:text-2xl">
            {formatCurrency(summary.totalArs, 'ARS', 'rounded')}
          </p>
          <p className="mt-0.5 text-[0.68rem] tabular-nums text-[var(--text-muted)]">
            {formatCurrency(summary.valueUsd, 'USD', 'rounded')} en especies
            {Math.abs(summary.cashArs) > 0.5 && ` · ${LABELS.cash} ${formatCurrency(summary.cashArs, 'ARS', 'rounded')}`}
          </p>
        </div>
        <div>
          <p className="lumus-label text-[0.56rem] text-[var(--text-muted)]">{LABELS.performance}</p>
          {summary.costUsd > 0 ? (
            <>
              <p className={`mt-1.5 text-xl font-bold leading-tight tabular-nums sm:text-2xl ${tone(summary.returnUsd)}`}>
                {percent(summary.returnPercent)}
              </p>
              <p className="mt-0.5 text-[0.68rem] tabular-nums text-[var(--text-muted)]">
                {signed(summary.returnUsd, formatCurrency(Math.abs(summary.returnUsd), 'USD', 'rounded'))} sobre lo que pagaste
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{positions.length ? LABELS.noReturn : '—'}</p>
          )}
        </div>
        {summary.unpriced > 0 && (
          <p className="col-span-2 text-[0.68rem] text-[var(--warning)]">{LABELS.unpriced(summary.unpriced)}</p>
        )}
      </div>

      {positions.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">{LABELS.emptyWallet}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{LABELS.emptyWalletHint}</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {positions
            .slice()
            .sort((a, b) => (b.valuation?.valueArs ?? 0) - (a.valuation?.valueArs ?? 0))
            .map(({ holding, position, price, valuation }) => {
              const currency = quoteCurrencyOf(holding.kind)
              const avg = averagePrice(position, holding.kind)
              const isOpen = open === holding.id
              const holdingTrades = trades
                .filter(t => t.holding_id === holding.id)
                .sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1))
              const busy = portfolio.pending === `holding:${holding.id}`

              return (
                <li key={holding.id}>
                  <button
                    onClick={() => setOpen(isOpen ? null : holding.id)}
                    aria-expanded={isOpen}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    {/* Qué es y cuánto hay */}
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                        <span className="truncate">{holding.name}</span>
                        <span className="shrink-0 rounded border border-white/10 px-1.5 py-px text-[0.55rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                          {KIND_LABELS[holding.kind]}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[0.68rem] tabular-nums text-[var(--text-muted)]">
                        {quantityText(position.quantity)} u.
                        {avg !== null && ` · ${LABELS.average} ${formatCurrency(avg, currency, 'auto')}`}
                      </p>
                    </div>

                    {/* Precio de hoy */}
                    <div className="hidden text-right sm:block">
                      {price ? (
                        <>
                          <p className="text-sm tabular-nums text-[var(--text-secondary)]">
                            {formatCurrency(currency === 'ARS' ? price.priceArs : price.priceUsd, currency, 'auto')}
                          </p>
                          <p className={`text-[0.68rem] tabular-nums ${price.changePercent !== null ? tone(price.changePercent) : 'text-[var(--text-muted)]'}`}>
                            {price.changePercent !== null ? `${percent(price.changePercent)} hoy` : LABELS.manual}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-[var(--warning)]">{LABELS.noPrice}</p>
                      )}
                    </div>

                    {/* Cuánto vale y cómo viene */}
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                        {valuation ? formatCurrency(valuation.valueArs, 'ARS', 'rounded') : '—'}
                      </p>
                      {valuation?.hasReturn ? (
                        <p className={`text-[0.68rem] font-medium tabular-nums ${tone(valuation.returnUsd)}`}>
                          {percent(valuation.returnPercent)} US$
                          {valuation.hasReturnArs && (
                            <span className="ml-1 font-normal text-[var(--text-muted)]">· {percent(valuation.returnArsPercent)} {LABELS.inPesos}</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-[0.68rem] text-[var(--text-muted)] sm:hidden">
                          {price ? '' : LABELS.noPrice}
                        </p>
                      )}
                    </div>

                    <ChevronDown
                      size={14}
                      className={`hidden text-[var(--text-muted)] transition-transform sm:block ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-2 bg-white/[0.015] px-5 pb-4 pt-1">
                      <p className="lumus-label text-[0.55rem] text-[var(--text-muted)]">{LABELS.trades}</p>
                      <ul className="space-y-1.5">
                        {holdingTrades.map(t => (
                          <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                              <span className="text-[var(--text-muted)]">
                                {formatDate(`${t.trade_date}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="flex-1 text-right tabular-nums text-[var(--text-secondary)]">
                                {t.side === 'venta' ? 'Venta · ' : ''}{quantityText(t.quantity)} × {formatCurrency(t.price, t.currency, 'auto')}
                              </span>
                              <button
                                onClick={() => void removeTrade(t.id)}
                                disabled={portfolio.pending === `trade:${t.id}`}
                                aria-label={LABELS.removeTrade}
                                className="rounded-md p-1 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                              >
                                <Trash2 size={12} />
                              </button>
                          </li>
                        ))}
                      </ul>
                      {holding.kind === 'otro' && (
                        <ManualPriceEditor
                          current={holding.manual_price}
                          busy={busy}
                          onSave={async value => {
                            try {
                              await portfolio.updateManualPrice(holding.id, value)
                              toast.success('Precio actualizado')
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'No se pudo actualizar')
                            }
                          }}
                        />
                      )}
                      <button
                        onClick={() => void removeHolding(holding)}
                        disabled={busy}
                        className="text-[0.68rem] text-[var(--text-muted)] hover:text-red-400 disabled:opacity-50"
                      >
                        {LABELS.removeHolding}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
        </ul>
      )}
    </article>
  )
}

/** Lo que no tiene precio automático se actualiza a mano, como el saldo de una billetera. */
function ManualPriceEditor({ current, busy, onSave }: {
  current: number | null
  busy: boolean
  onSave: (value: number) => Promise<void>
}) {
  const [value, setValue] = useState(current !== null ? String(current) : '')
  const parsed = Number(value)
  const valid = value !== '' && Number.isFinite(parsed) && parsed >= 0

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        if (valid) void onSave(parsed)
      }}
      className="flex items-center gap-2 pt-1"
    >
      <label className="text-[0.68rem] text-[var(--text-muted)]" htmlFor="manual-price">Precio hoy (USD)</label>
      <input
        id="manual-price"
        value={value}
        onChange={e => setValue(e.target.value)}
        type="number"
        step="any"
        inputMode="decimal"
        className="w-28 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-lumus)]"
      />
      <button
        type="submit"
        disabled={!valid || busy}
        className="rounded-lg border border-white/10 px-2 py-1 text-[0.68rem] text-[var(--text-secondary)] hover:border-white/20 disabled:opacity-50"
      >
        Guardar
      </button>
    </form>
  )
}
