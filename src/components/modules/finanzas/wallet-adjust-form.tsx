'use client'

import { useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import type { Wallet } from '@/types/finance.types'
import { formatCurrency } from '@/lib/utils/format-currency'

interface WalletAdjustFormProps {
  wallet: Wallet
  onAdjust: (newBalance: number, note: string) => Promise<void>
  onClose: () => void
}

export function WalletAdjustForm({ wallet, onAdjust, onClose }: WalletAdjustFormProps) {
  const [newBalance, setNewBalance] = useState<string>(String(wallet.balance))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const parsed = parseFloat(newBalance)
  const isValid = !isNaN(parsed)
  const diff = isValid ? parsed - wallet.balance : 0
  const changed = Math.abs(diff) > 0.01

  const fmt = (n: number) => formatCurrency(n, wallet.currency, 'rounded')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !changed) return
    setLoading(true)
    await onAdjust(parsed, note)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass w-full max-w-sm rounded-t-2xl rounded-b-none p-5 max-h-[92vh] overflow-y-auto sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              <SlidersHorizontal size={15} className="text-[var(--accent-lumus)]" />
            </div>
            <div>
              <h2 className="lumus-heading text-base font-semibold text-[var(--text-primary)]">
                Ajustar balance
              </h2>
              <p className="text-[0.65rem] text-[var(--text-muted)]">{wallet.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Balance actual */}
          <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
            <span className="text-xs text-[var(--text-muted)]">Balance actual</span>
            <span className="lumus-heading text-base font-bold text-[var(--text-primary)]">
              {fmt(wallet.balance)}
            </span>
          </div>

          {/* Nuevo balance */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              BALANCE REAL
            </label>
            <input
              type="number"
              step="0.01"
              value={newBalance}
              onChange={e => setNewBalance(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
          </div>

          {/* Diferencia */}
          {changed && isValid && (
            <div className={`rounded-lg px-3 py-2.5 text-sm ${
              diff > 0
                ? 'bg-[var(--success)]/10 text-[var(--success)]'
                : 'bg-[var(--danger)]/10 text-[var(--danger)]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs">
                  {diff > 0 ? 'Ajuste positivo de saldo' : 'Ajuste negativo de saldo'}
                </span>
                <span className="lumus-heading font-bold">
                  {diff > 0 ? '+' : ''}{fmt(diff)}
                </span>
              </div>
              <p className="mt-1 text-[0.65rem] opacity-80">
                Queda en el historial y no impacta ingresos ni gastos.
              </p>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              MOTIVO <span className="normal-case text-[var(--text-muted)]">(opcional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Corrección de saldo real"
              maxLength={200}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!changed || !isValid || loading}
              className="flex-1 rounded-lg bg-[var(--accent-lumus)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
            >
              {loading ? 'Ajustando...' : 'Confirmar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
