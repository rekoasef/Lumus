'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { CRYPTO_OPTIONS } from '@/lib/finance/crypto-prices'
import { quoteCurrencyOf, type HoldingKind, type TradeCurrency } from '@/lib/finance/holdings'
import { createPurchaseSchema, type CreatePurchaseInput } from '@/lib/validations/finance'
import { formatCurrency } from '@/lib/utils/format-currency'
import { localDateStr } from '@/lib/utils/format-date'
import type { Wallet } from '@/types/finance.types'

const LABELS = {
  title: 'Agregar compra',
  kind: 'Qué compraste',
  ticker: 'Ticker',
  tickerPlaceholder: { accion: 'GGAL, YPFD, PAMP…', cedear: 'AAPL, SPY, MELI…' },
  tickerHint: 'El precio se busca solo, en pesos.',
  tickerUnavailable: 'No se pudo traer la lista de tickers. Escribilo igual: si existe, el precio aparece solo.',
  crypto: 'Cripto',
  cryptoHint: 'El precio se busca solo, en dólares.',
  name: 'Nombre',
  namePlaceholder: 'Bono, obligación negociable…',
  manualPrice: 'Precio actual por unidad (USD)',
  manualHint: 'No tiene precio automático: lo actualizás vos.',
  quantity: 'Cantidad',
  price: 'Precio pagado por unidad',
  date: 'Fecha de compra',
  total: 'Total de la compra',
  cancel: 'Cancelar',
  save: 'Agregar',
  saving: 'Guardando...',
} as const

const KINDS: { value: HoldingKind; label: string }[] = [
  { value: 'accion', label: 'Acción' },
  { value: 'cedear', label: 'CEDEAR' },
  { value: 'cripto', label: 'Cripto' },
  { value: 'otro',   label: 'Otro' },
]

interface PurchaseFormProps {
  wallet: Wallet
  saving: boolean
  onSave: (input: CreatePurchaseInput) => Promise<boolean>
  onClose: () => void
}

type TickerList = { kind: 'accion' | 'cedear'; symbols: string[]; available: boolean }

export function PurchaseForm({ wallet, saving, onSave, onClose }: PurchaseFormProps) {
  const [kind, setKind] = useState<HoldingKind>('accion')
  const [ticker, setTicker] = useState('')
  const [cryptoId, setCryptoId] = useState<string>(CRYPTO_OPTIONS[0].id)
  const [name, setName] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<TradeCurrency>('ARS')
  const [tradeDate, setTradeDate] = useState(localDateStr())
  const [tickers, setTickers] = useState<TickerList | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isMarket = kind === 'accion' || kind === 'cedear'

  // La lista de tickers se pide al elegir el tipo, no al abrir la pantalla: la
  // de CEDEARs son mil especies, y solo hace falta si alguien va a cargar una.
  useEffect(() => {
    if (kind !== 'accion' && kind !== 'cedear') return
    let cancelled = false
    fetch(`/api/finance/market/instruments?kind=${kind}`)
      .then(res => (res.ok ? res.json() : { symbols: [], available: false }))
      .then((data: { symbols?: string[]; available?: boolean }) => {
        if (!cancelled) setTickers({ kind, symbols: data.symbols ?? [], available: data.available ?? false })
      })
      .catch(() => {
        if (!cancelled) setTickers({ kind, symbols: [], available: false })
      })
    return () => { cancelled = true }
  }, [kind])

  function chooseKind(next: HoldingKind) {
    setKind(next)
    // Cada tipo sugiere la moneda en la que cotiza; se puede cambiar igual.
    setCurrency(quoteCurrencyOf(next))
    setError(null)
  }

  const qty = Number(quantity)
  const unit = Number(price)
  const total = quantity && price && Number.isFinite(qty * unit) ? qty * unit : null
  const currentTickers = tickers?.kind === kind ? tickers : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input = {
      wallet_id: wallet.id,
      kind,
      price_source: kind === 'cripto' ? cryptoId : isMarket ? ticker.trim().toUpperCase() : null,
      name: kind === 'cripto'
        ? CRYPTO_OPTIONS.find(c => c.id === cryptoId)?.label ?? cryptoId
        : isMarket ? ticker.trim().toUpperCase() || '—' : name,
      manual_price: kind === 'otro' && manualPrice !== '' ? Number(manualPrice) : null,
      quantity: qty,
      price: unit,
      currency,
      trade_date: tradeDate,
    }

    if (isMarket && !ticker.trim()) {
      setError('Poné el ticker')
      return
    }
    const parsed = createPurchaseSchema.safeParse(input)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá los datos')
      return
    }
    setError(null)
    const ok = await onSave(parsed.data)
    if (!ok) setError('No se pudo guardar la compra')
  }

  const field = 'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-lumus)]'
  const label = 'mb-1.5 block text-[0.68rem] font-medium text-[var(--text-secondary)]'
  const hint = 'mt-1.5 text-[0.65rem] text-[var(--text-muted)]'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass flex max-h-[94svh] w-full max-w-md flex-col rounded-t-3xl sm:rounded-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 sm:px-6">
          <div>
            <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">{LABELS.title}</h2>
            <p className="text-[0.7rem] text-[var(--text-muted)]">{wallet.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={LABELS.cancel}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[var(--text-muted)] hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6 sm:px-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className={label}>{LABELS.kind}</span>
              <div className="grid grid-cols-4 gap-1.5">
                {KINDS.map(k => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => chooseKind(k.value)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      kind === k.value
                        ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                        : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            {isMarket && (
              <div>
                <label className={label} htmlFor="purchase-ticker">{LABELS.ticker}</label>
                <input
                  id="purchase-ticker"
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  list="purchase-tickers"
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder={LABELS.tickerPlaceholder[kind]}
                  className={field}
                />
                <datalist id="purchase-tickers">
                  {currentTickers?.symbols.map(symbol => <option key={symbol} value={symbol} />)}
                </datalist>
                <p className={hint}>
                  {currentTickers && !currentTickers.available ? LABELS.tickerUnavailable : LABELS.tickerHint}
                </p>
              </div>
            )}

            {kind === 'cripto' && (
              <div>
                <label className={label} htmlFor="purchase-crypto">{LABELS.crypto}</label>
                <select id="purchase-crypto" value={cryptoId} onChange={e => setCryptoId(e.target.value)} className={field}>
                  {CRYPTO_OPTIONS.map(c => (
                    <option key={c.id} value={c.id}>{c.label} ({c.symbol})</option>
                  ))}
                </select>
                <p className={hint}>{LABELS.cryptoHint}</p>
              </div>
            )}

            {kind === 'otro' && (
              <>
                <div>
                  <label className={label} htmlFor="purchase-name">{LABELS.name}</label>
                  <input id="purchase-name" value={name} onChange={e => setName(e.target.value)} placeholder={LABELS.namePlaceholder} className={field} />
                </div>
                <div>
                  <label className={label} htmlFor="purchase-manual">{LABELS.manualPrice}</label>
                  <input
                    id="purchase-manual"
                    value={manualPrice}
                    onChange={e => setManualPrice(e.target.value)}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className={field}
                  />
                  <p className={hint}>{LABELS.manualHint}</p>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="purchase-qty">{LABELS.quantity}</label>
                <input
                  id="purchase-qty"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="purchase-date">{LABELS.date}</label>
                <input
                  id="purchase-date"
                  value={tradeDate}
                  max={localDateStr()}
                  onChange={e => setTradeDate(e.target.value)}
                  type="date"
                  className={field}
                />
              </div>
            </div>

            <div>
              <label className={label} htmlFor="purchase-price">{LABELS.price}</label>
              <div className="flex gap-2">
                <input
                  id="purchase-price"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className={field}
                />
                <div className="flex shrink-0 gap-1">
                  {(['ARS', 'USD'] as const).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={`rounded-lg border px-3 text-xs font-medium transition-colors ${
                        currency === c
                          ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                          : 'border-white/10 text-[var(--text-secondary)]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {total !== null && (
              <div className="flex items-baseline justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="text-xs text-[var(--text-secondary)]">{LABELS.total}</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(total, currency, 'auto')}</span>
              </div>
            )}

            {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 py-3.5 text-sm font-medium text-[var(--text-secondary)] sm:py-2.5"
              >
                {LABELS.cancel}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-[var(--accent-lumus)] py-3.5 text-sm font-semibold text-white disabled:opacity-50 sm:py-2.5"
              >
                {saving ? LABELS.saving : LABELS.save}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
