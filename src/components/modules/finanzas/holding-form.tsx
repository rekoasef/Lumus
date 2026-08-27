'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { CRYPTO_OPTIONS } from '@/lib/finance/crypto-prices'
import type { Holding, HoldingKind } from '@/lib/finance/holdings'
import type { CreateHoldingInput } from '@/lib/validations/finance'

const LABELS = {
  newTitle: 'Nueva tenencia',
  editTitle: 'Editar tenencia',
  kind: 'Tipo',
  crypto: 'Elegí la cripto',
  name: 'Nombre',
  namePlaceholder: 'Plazo fijo Galicia',
  quantity: 'Cantidad',
  purchasePrice: 'Precio pagado por unidad',
  purchaseDate: 'Fecha de compra',
  manualPrice: 'Precio actual por unidad (USD)',
  manualHint: 'Lo actualizás vos, igual que el saldo de una billetera.',
  cryptoHint: 'El precio se busca solo.',
  cancel: 'Cancelar',
  save: 'Guardar',
  saving: 'Guardando...',
  required: 'Completá los campos obligatorios.',
} as const

const KINDS: { value: HoldingKind; label: string }[] = [
  { value: 'cripto', label: 'Cripto' },
  { value: 'accion', label: 'Acción' },
  { value: 'otro',   label: 'Otro' },
]

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface HoldingFormProps {
  initial?: Holding
  saving: boolean
  onSave: (input: CreateHoldingInput) => Promise<void>
  onClose: () => void
}

export function HoldingForm({ initial, saving, onSave, onClose }: HoldingFormProps) {
  const [kind, setKind] = useState<HoldingKind>(initial?.kind ?? 'cripto')
  const [priceSource, setPriceSource] = useState(initial?.price_source ?? CRYPTO_OPTIONS[0].id)
  const [name, setName] = useState(initial?.name ?? '')
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : '')
  const [purchasePrice, setPurchasePrice] = useState(initial ? String(initial.purchase_price) : '')
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(initial?.purchase_currency ?? 'USD')
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchase_date ?? todayStr())
  const [manualPrice, setManualPrice] = useState(initial?.manual_price ? String(initial.manual_price) : '')
  const [error, setError] = useState<string | null>(null)

  const isCrypto = kind === 'cripto'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const qty = Number(quantity)
    const paid = Number(purchasePrice)
    const manual = manualPrice ? Number(manualPrice) : null
    const chosenName = isCrypto
      ? CRYPTO_OPTIONS.find(c => c.id === priceSource)?.label ?? priceSource
      : name.trim()

    if (!chosenName || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(paid)) {
      setError(LABELS.required)
      return
    }
    if (!isCrypto && (manual === null || !Number.isFinite(manual))) {
      setError(LABELS.required)
      return
    }

    await onSave({
      name: chosenName,
      kind,
      price_source: isCrypto ? priceSource : null,
      quantity: qty,
      purchase_price: paid,
      purchase_currency: currency,
      purchase_date: purchaseDate,
      manual_price: isCrypto ? null : manual,
    })
  }

  const field = 'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-lumus)]'
  const label = 'mb-1.5 block text-[0.68rem] font-medium text-[var(--text-secondary)]'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass flex max-h-[94svh] w-full max-w-md flex-col rounded-t-3xl sm:rounded-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 sm:px-6">
          <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">
            {initial ? LABELS.editTitle : LABELS.newTitle}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[var(--text-muted)] hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6 sm:px-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className={label}>{LABELS.kind}</span>
              <div className="flex gap-2">
                {KINDS.map(k => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
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

            {isCrypto ? (
              <div>
                <label className={label} htmlFor="holding-crypto">{LABELS.crypto}</label>
                <select
                  id="holding-crypto"
                  value={priceSource}
                  onChange={e => setPriceSource(e.target.value)}
                  className={field}
                >
                  {CRYPTO_OPTIONS.map(c => (
                    <option key={c.id} value={c.id}>{c.label} ({c.symbol})</option>
                  ))}
                </select>
                <p className="mt-1.5 text-[0.65rem] text-[var(--text-muted)]">{LABELS.cryptoHint}</p>
              </div>
            ) : (
              <div>
                <label className={label} htmlFor="holding-name">{LABELS.name}</label>
                <input
                  id="holding-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={LABELS.namePlaceholder}
                  className={field}
                />
              </div>
            )}

            <div>
              <label className={label} htmlFor="holding-qty">{LABELS.quantity}</label>
              <input
                id="holding-qty"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                type="number"
                step="any"
                inputMode="decimal"
                className={field}
              />
            </div>

            <div>
              <label className={label} htmlFor="holding-paid">{LABELS.purchasePrice}</label>
              <div className="flex gap-2">
                <input
                  id="holding-paid"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className={field}
                />
                <div className="flex shrink-0 gap-1">
                  {(['USD', 'ARS'] as const).map(c => (
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

            <div>
              <label className={label} htmlFor="holding-date">{LABELS.purchaseDate}</label>
              <input
                id="holding-date"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                type="date"
                className={field}
              />
            </div>

            {!isCrypto && (
              <div>
                <label className={label} htmlFor="holding-manual">{LABELS.manualPrice}</label>
                <input
                  id="holding-manual"
                  value={manualPrice}
                  onChange={e => setManualPrice(e.target.value)}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className={field}
                />
                <p className="mt-1.5 text-[0.65rem] text-[var(--text-muted)]">{LABELS.manualHint}</p>
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
