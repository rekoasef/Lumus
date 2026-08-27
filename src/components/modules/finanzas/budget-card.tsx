'use client'

import { Pencil, Trash2, AlertTriangle } from 'lucide-react'
import type { Budget } from '@/types/finance.types'
import { CategoryIcon } from '@/lib/utils/category-icons'
import { budgetUsage } from '@/lib/finance/rules'
import { formatCurrency } from '@/lib/utils/format-currency'

interface BudgetCardProps {
  budget: Budget
  currency?: string
  onEdit: (budget: Budget) => void
  onDelete: (id: string) => void
}

export function BudgetCard({ budget, currency = 'ARS', onEdit, onDelete }: BudgetCardProps) {
  const { spent, limit, ratioClamped, percent, remaining, overspent, overspentBy, status } = budgetUsage(budget)

  const statusColor = {
    ok:      'var(--accent-lumus)',
    warning: '#f59e0b',
    danger:  'var(--danger)',
  }[status]

  const accentColor = budget.category?.color ?? statusColor

  const format = (v: number) => formatCurrency(v, currency, 'rounded')

  return (
    <div className="lumus-glass group relative rounded-xl p-5 transition-all hover:border-white/15">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}22` }}
          >
            {budget.category?.icon ? (
              <CategoryIcon icon={budget.category.icon} size={16} style={{ color: accentColor }} />
            ) : (
              <span className="text-sm font-semibold" style={{ color: accentColor }}>
                {budget.category?.name?.[0]?.toUpperCase() ?? '$'}
              </span>
            )}
          </div>
          <div>
            <p className="lumus-heading text-sm font-semibold text-[var(--text-primary)]">
              {budget.category?.name ?? 'Sin categoría'}
            </p>
            <p className="lumus-label mt-0.5 text-[0.6rem] text-[var(--text-muted)]">
              LÍMITE {format(limit)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {status !== 'ok' && (
            <AlertTriangle
              size={14}
              className="mr-1"
              style={{ color: statusColor }}
              aria-label={overspent ? 'Sobregirado' : 'Cerca del límite'}
            />
          )}
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onEdit(budget)}
              className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
              aria-label="Editar presupuesto"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(budget.id)}
              className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              aria-label="Eliminar presupuesto"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-baseline justify-between">
          <p
            className="lumus-heading text-2xl font-bold"
            style={{ color: statusColor }}
          >
            {format(spent)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {percent}%
          </p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${ratioClamped * 100}%`,
              backgroundColor: statusColor,
            }}
          />
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          {overspent
            ? `Sobregirado ${format(overspentBy)}`
            : `Te queda ${format(remaining)}`}
        </p>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl opacity-40"
        style={{ backgroundColor: accentColor }}
      />
    </div>
  )
}
