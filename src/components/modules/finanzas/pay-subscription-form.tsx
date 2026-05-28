'use client'

import { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import type { Subscription, FinanceCategory, Wallet } from '@/types/finance.types'
import { CategoryIcon } from '@/lib/utils/category-icons'

interface PaySubscriptionFormProps {
  subscription: Subscription
  categories: FinanceCategory[]
  wallets: Wallet[]
  onPay: (amount: number, categoryId: string | null, walletId: string | null, date: string) => Promise<void>
  onClose: () => void
}

export function PaySubscriptionForm({
  subscription: s,
  categories,
  wallets,
  onPay,
  onClose,
}: PaySubscriptionFormProps) {
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()

  const [amount, setAmount]     = useState(s.variable ? '' : String(s.amount))
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [walletId, setWalletId] = useState<string | null>(s.wallet_id)
  const [date, setDate]         = useState(today)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const gastoCategories = categories.filter(c => c.type === 'gasto')
  const parsedAmount    = parseFloat(amount)
  const isValid         = !isNaN(parsedAmount) && parsedAmount > 0

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: s.currency, minimumFractionDigits: 0 }).format(n)

  async function handleSubmit() {
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    try {
      await onPay(parsedAmount, categoryId, walletId, date)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar el pago')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass w-full max-w-sm rounded-t-2xl rounded-b-none p-5 max-h-[92vh] overflow-y-auto sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--success)]" />
            <h2 className="lumus-heading text-base font-semibold text-[var(--text-primary)]">
              Pagar — {s.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Monto */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              MONTO PAGADO{s.variable && ' (variable)'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">$</span>
              <input
                type="number"
                step="1"
                min="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={s.variable ? '0' : String(s.amount)}
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-7 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
              />
            </div>
            {!s.variable && (
              <p className="mt-1 text-[0.6rem] text-[var(--text-muted)]">
                Monto habitual: {fmt(s.amount)}
              </p>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">FECHA</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none [color-scheme:dark]"
            />
          </div>

          {/* Categoría */}
          {gastoCategories.length > 0 && (
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                CATEGORÍA <span className="normal-case">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCategoryId(null)}
                  className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                    categoryId === null
                      ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                      : 'border-white/10 text-[var(--text-muted)] hover:border-white/20'
                  }`}
                >
                  Sin categoría
                </button>
                {gastoCategories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                      categoryId === c.id
                        ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                        : 'border-white/10 text-[var(--text-muted)] hover:border-white/20'
                    }`}
                  >
                    <CategoryIcon icon={c.icon ?? ''} size={11} style={{ color: categoryId === c.id ? 'var(--accent-lumus)' : c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Billetera */}
          {wallets.length > 0 && (
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">BILLETERA</label>
              <select
                value={walletId ?? ''}
                onChange={e => setWalletId(e.target.value || null)}
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
              >
                <option value="">Sin billetera</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="flex-1 rounded-lg bg-[var(--success)] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Registrando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}
