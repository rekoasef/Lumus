'use client'

import { Pencil, Trash2, SlidersHorizontal } from 'lucide-react'
import type { Transaction } from '@/types/finance.types'
import { CategoryIcon } from '@/lib/utils/category-icons'

interface TransactionItemProps {
  transaction: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
  const isGasto      = transaction.type === 'gasto'
  const isAdjustment = transaction.type === 'ajuste'
  const color        = isAdjustment ? '#7c6dfa' : transaction.category?.color ?? (isGasto ? '#ef4444' : '#22c55e')
  const amountSign   = isAdjustment ? (transaction.amount < 0 ? '−' : '+') : isGasto ? '−' : '+'
  const amountColor  = isAdjustment
    ? 'text-[var(--accent-lumus)]'
    : isGasto ? 'text-[var(--danger)]' : 'text-[var(--success)]'

  const formattedAmount = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(Math.abs(transaction.amount))

  const formattedDate = new Date(transaction.date + 'T12:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  })

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3 transition-colors hover:bg-white/[0.04] sm:gap-4 sm:px-4">
      {/* Ícono de categoría */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}22` }}
      >
        {isAdjustment ? (
          <SlidersHorizontal size={15} style={{ color }} />
        ) : transaction.category?.icon ? (
          <CategoryIcon icon={transaction.category.icon} size={15} style={{ color }} />
        ) : (
          <span className="text-xs font-bold" style={{ color }}>
            {isGasto ? '−' : '+'}
          </span>
        )}
      </div>

      {/* Descripción */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {transaction.description ?? (isAdjustment ? 'Ajuste de balance' : transaction.type)}
          </p>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {isAdjustment && (
            <span className="lumus-label text-[0.58rem]" style={{ color }}>
              Ajuste
            </span>
          )}
          {!isAdjustment && transaction.category && (
            <span className="lumus-label text-[0.58rem]" style={{ color }}>
              {transaction.category.name}
            </span>
          )}
          {transaction.wallet && (
            <span className="lumus-label text-[0.58rem] text-[var(--text-muted)]">
              · {transaction.wallet.name}
            </span>
          )}
        </div>
      </div>

      {/* Fecha */}
      <p className="lumus-label shrink-0 text-[0.6rem] text-[var(--text-muted)]">
        {formattedDate}
      </p>

      {/* Monto */}
      <p className={`lumus-heading shrink-0 text-sm font-bold sm:text-base ${amountColor}`}>
        {amountSign}{formattedAmount}
      </p>

      {/* Acciones — visibles siempre en mobile, hover en desktop */}
      <div className="flex shrink-0 gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        {!isAdjustment && (
          <button
            onClick={() => onEdit(transaction)}
            className="rounded-md p-2 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] active:bg-white/10 sm:p-1.5"
            aria-label="Editar"
          >
            <Pencil size={13} />
          </button>
        )}
        <button
          onClick={() => onDelete(transaction.id)}
          className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] active:bg-[var(--danger)]/10 active:text-[var(--danger)] sm:p-1.5"
          aria-label="Eliminar"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
