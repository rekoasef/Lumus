'use client'

import { Pencil, Trash2, Sparkles } from 'lucide-react'
import type { Transaction } from '@/types/finance.types'

interface TransactionItemProps {
  transaction: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
  const isGasto = transaction.type === 'gasto'

  const formattedAmount = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(transaction.amount)

  const formattedDate = new Date(transaction.date + 'T12:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  })

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition-colors hover:bg-white/[0.04]">
      {/* Indicador de tipo */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
        style={{
          backgroundColor: transaction.category?.color
            ? `${transaction.category.color}22`
            : isGasto ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
          color: transaction.category?.color
            ?? (isGasto ? 'var(--danger)' : 'var(--success)'),
        }}
      >
        {transaction.category?.icon?.slice(0, 2).toUpperCase() ?? (isGasto ? '−' : '+')}
      </div>

      {/* Descripción */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {transaction.description ?? transaction.type}
          </p>
          {transaction.auto_classified && (
            <Sparkles size={11} className="shrink-0 text-[var(--accent-lumus)]" aria-label="Clasificado por IA" />
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {transaction.category && (
            <span
              className="lumus-label text-[0.58rem]"
              style={{ color: transaction.category.color }}
            >
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
      <p
        className={`lumus-heading shrink-0 text-base font-bold ${
          isGasto ? 'text-[var(--danger)]' : 'text-[var(--success)]'
        }`}
      >
        {isGasto ? '−' : '+'}{formattedAmount}
      </p>

      {/* Acciones */}
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(transaction)}
          className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
          aria-label="Editar"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(transaction.id)}
          className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
          aria-label="Eliminar"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
