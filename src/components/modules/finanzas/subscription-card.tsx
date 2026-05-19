'use client'

import { Pencil, Trash2, Calendar, Power } from 'lucide-react'
import type { Subscription } from '@/types/finance.types'

const CYCLE_LABELS: Record<string, string> = {
  mensual: 'Mensual',
  anual:   'Anual',
  semanal: 'Semanal',
}

const ACCENT_COLORS = ['#bdb4ff', '#22c55e', '#f97316', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#eab308']

function getAccentColor(name: string): string {
  return ACCENT_COLORS[name.charCodeAt(0) % ACCENT_COLORS.length]
}

function monthlyEquivalent(amount: number, cycle: string): number {
  if (cycle === 'anual')   return amount / 12
  if (cycle === 'semanal') return amount * (52 / 12)
  return amount
}

function nextBillingLabel(dateStr: string | null): { label: string; urgent: boolean } {
  if (!dateStr) return { label: '', urgent: false }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0)  return { label: 'Vencida', urgent: true }
  if (diff === 0) return { label: 'Hoy', urgent: true }
  if (diff <= 7)  return { label: `En ${diff} día${diff > 1 ? 's' : ''}`, urgent: true }
  return {
    label: date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
    urgent: false,
  }
}

interface SubscriptionCardProps {
  subscription: Subscription
  onEdit: (s: Subscription) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, active: boolean) => void
}

export function SubscriptionCard({ subscription: s, onEdit, onDelete, onToggleActive }: SubscriptionCardProps) {
  const color = getAccentColor(s.name)
  const monthly = monthlyEquivalent(s.amount, s.billing_cycle)
  const billing = nextBillingLabel(s.next_billing)

  const fmt = (v: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: s.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)

  return (
    <div className={`lumus-glass group relative rounded-xl p-5 transition-all hover:border-white/15 ${!s.active ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {s.icon ?? s.name[0].toUpperCase()}
          </div>
          <div>
            <p className="lumus-heading text-sm font-semibold text-[var(--text-primary)]">
              {s.name}
            </p>
            <p className="lumus-label mt-0.5 text-[0.6rem] text-[var(--text-muted)]">
              {CYCLE_LABELS[s.billing_cycle] ?? s.billing_cycle}
              {!s.active && ' · Inactiva'}
            </p>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onToggleActive(s.id, !s.active)}
            className={`rounded-md p-1.5 transition-colors ${
              s.active
                ? 'text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]'
                : 'text-[var(--success)] hover:bg-[var(--success)]/10'
            }`}
            aria-label={s.active ? 'Desactivar' : 'Activar'}
          >
            <Power size={14} />
          </button>
          <button
            onClick={() => onEdit(s)}
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
            aria-label="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(s.id)}
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            aria-label="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div>
          <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">
            {s.billing_cycle === 'mensual' ? 'POR MES' : 'POR CICLO'}
          </p>
          <p className="lumus-heading mt-0.5 text-2xl font-bold" style={{ color }}>
            {fmt(s.amount)}
          </p>
          {s.billing_cycle !== 'mensual' && (
            <p className="text-xs text-[var(--text-muted)]">≈ {fmt(monthly)} / mes</p>
          )}
        </div>

        {billing.label && (
          <div className="flex items-center gap-1.5">
            <Calendar
              size={11}
              style={{ color: billing.urgent ? 'var(--warning)' : 'var(--text-muted)' }}
            />
            <p
              className="text-xs"
              style={{ color: billing.urgent ? 'var(--warning)' : 'var(--text-muted)' }}
            >
              {billing.label}
            </p>
          </div>
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl opacity-40"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}
