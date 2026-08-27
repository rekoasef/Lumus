'use client'

import { useState } from 'react'
import { CategoryIcon } from '@/lib/utils/category-icons'
import { Pencil, Trash2, CheckCircle2, Plus, Wallet } from 'lucide-react'
import type { SavingGoal, Wallet as WalletType } from '@/types/finance.types'
import { savingGoalProgress } from '@/lib/finance/rules'
import { formatCurrency } from '@/lib/utils/format-currency'

function daysUntil(dateStr: string | null): { label: string; urgent: boolean } | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0)  return { label: 'Fecha vencida', urgent: true }
  if (diff === 0) return { label: 'Vence hoy', urgent: true }
  if (diff <= 30) return { label: `${diff} días restantes`, urgent: diff <= 7 }
  return {
    label: date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }),
    urgent: false,
  }
}

interface SavingGoalCardProps {
  goal: SavingGoal
  wallets: WalletType[]
  toARS: (amount: number, currency: string) => number
  onEdit: (g: SavingGoal) => void
  onDelete: (id: string) => void
  onContribute: (id: string, amount: number, walletId?: string | null) => Promise<void>
  onMarkAchieved: (id: string) => Promise<void>
}

export function SavingGoalCard({ goal, wallets, toARS, onEdit, onDelete, onContribute, onMarkAchieved }: SavingGoalCardProps) {
  const [contributing, setContributing] = useState(false)
  const [amount, setAmount]             = useState('')
  const [walletId, setWalletId]         = useState<string | null>(goal.wallet_ids[0] ?? null)
  const [saving, setSaving]             = useState(false)

  const associatedWallets = wallets.filter(w => goal.wallet_ids.includes(w.id))

  const { currentAmount, ratio, percent, remaining, reached } = savingGoalProgress(goal, associatedWallets, toARS)
  const deadline = daysUntil(goal.target_date)

  const color = goal.achieved || reached
    ? 'var(--success)'
    : deadline?.urgent
    ? 'var(--warning)'
    : 'var(--accent-lumus)'

  const fmt = (v: number) => formatCurrency(v, 'ARS', 'rounded')

  async function handleContribute() {
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    setSaving(true)
    await onContribute(goal.id, n, walletId)
    setAmount('')
    setContributing(false)
    setSaving(false)
  }

  function openContribute() {
    setWalletId(goal.wallet_ids[0] ?? null)
    setContributing(true)
  }

  return (
    <div className="lumus-glass group relative rounded-xl p-5 transition-all hover:border-white/15">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {goal.icon
              ? <CategoryIcon icon={goal.icon} size={17} style={{ color }} />
              : goal.name[0].toUpperCase()}
          </div>
          <div>
            <p className="lumus-heading text-sm font-semibold text-[var(--text-primary)]">
              {goal.name}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              {deadline && (
                <p
                  className="lumus-label text-[0.6rem]"
                  style={{ color: deadline.urgent ? 'var(--warning)' : 'var(--text-muted)' }}
                >
                  {deadline.label}
                </p>
              )}
              {associatedWallets.length > 0 && (
                <span className="flex items-center gap-0.5 text-[0.58rem] text-[var(--text-muted)]">
                  {deadline && '·'}
                  <Wallet size={9} className="shrink-0" />
                  {associatedWallets.map(w => w.name).join(' + ')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {!goal.achieved && (
            <button
              onClick={() => onMarkAchieved(goal.id)}
              className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--success)]/10 hover:text-[var(--success)]"
              aria-label="Marcar como alcanzada"
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          <button
            onClick={() => onEdit(goal)}
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
            aria-label="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            aria-label="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {goal.achieved ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
              ¡Meta alcanzada!
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <p className="lumus-heading text-2xl font-bold" style={{ color }}>
                {fmt(currentAmount)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">de {fmt(goal.target_amount)}</p>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${ratio * 100}%`, backgroundColor: color }}
              />
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Faltan {fmt(remaining)} · {percent}% completado
            </p>
          </>
        )}

        {!goal.achieved && (
          contributing ? (
            <div className="space-y-2 pt-1">
              {/* Monto */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleContribute()}
                    placeholder="0"
                    autoFocus
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-6 pr-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleContribute}
                  disabled={saving || !amount}
                  className="rounded-lg bg-[var(--accent-lumus)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {saving ? '…' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setContributing(false); setAmount('') }}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:bg-white/5"
                >
                  ×
                </button>
              </div>

              {/* Billetera */}
              {(associatedWallets.length > 0 ? associatedWallets : wallets).length > 0 && (
                <div>
                  <label className="lumus-label mb-1 block text-[0.58rem] text-[var(--text-muted)]">
                    REGISTRAR EN
                  </label>
                  <select
                    value={walletId ?? ''}
                    onChange={e => setWalletId(e.target.value || null)}
                    className="w-full rounded-lg border border-white/10 bg-[#111118] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
                  >
                    <option value="">Sin billetera (solo aporte manual)</option>
                    {(associatedWallets.length > 0 ? associatedWallets : wallets).map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  {walletId && (
                    <p className="mt-0.5 text-[0.58rem] text-[var(--text-muted)]">
                      El aporte se registrará como gasto en esa billetera.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openContribute}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-white/20 hover:text-[var(--text-secondary)]"
            >
              <Plus size={12} />
              Aportar
            </button>
          )
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl opacity-40"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}
