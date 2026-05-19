'use client'

import { useState } from 'react'
import { Pencil, Trash2, CheckCircle2, Plus } from 'lucide-react'
import type { SavingGoal } from '@/types/finance.types'

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
  onEdit: (g: SavingGoal) => void
  onDelete: (id: string) => void
  onContribute: (id: string, amount: number) => Promise<void>
  onMarkAchieved: (id: string) => Promise<void>
}

export function SavingGoalCard({ goal, onEdit, onDelete, onContribute, onMarkAchieved }: SavingGoalCardProps) {
  const [contributing, setContributing] = useState(false)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const pct = goal.target_amount > 0 ? Math.min(goal.current_amount / goal.target_amount, 1) : 0
  const remaining = Math.max(goal.target_amount - goal.current_amount, 0)
  const deadline = daysUntil(goal.target_date)

  const color = goal.achieved || pct >= 1
    ? 'var(--success)'
    : deadline?.urgent
    ? 'var(--warning)'
    : 'var(--accent-lumus)'

  const fmt = (v: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)

  async function handleContribute() {
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    setSaving(true)
    await onContribute(goal.id, n)
    setAmount('')
    setContributing(false)
    setSaving(false)
  }

  return (
    <div className="lumus-glass group relative rounded-xl p-5 transition-all hover:border-white/15">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {goal.icon ?? goal.name[0].toUpperCase()}
          </div>
          <div>
            <p className="lumus-heading text-sm font-semibold text-[var(--text-primary)]">
              {goal.name}
            </p>
            {deadline && (
              <p
                className="lumus-label mt-0.5 text-[0.6rem]"
                style={{ color: deadline.urgent ? 'var(--warning)' : 'var(--text-muted)' }}
              >
                {deadline.label}
              </p>
            )}
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
                {fmt(goal.current_amount)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">de {fmt(goal.target_amount)}</p>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct * 100}%`, backgroundColor: color }}
              />
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Faltan {fmt(remaining)} · {(pct * 100).toFixed(0)}% completado
            </p>
          </>
        )}

        {!goal.achieved && (
          contributing ? (
            <div className="flex gap-2 pt-1">
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
          ) : (
            <button
              onClick={() => setContributing(true)}
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
