'use client'

import { useState } from 'react'
import { Plus, Filter, X } from 'lucide-react'
import type { Transaction, Wallet, FinanceCategory } from '@/types/finance.types'
import { TransactionItem } from './transaction-item'
import { TransactionForm } from './transaction-form'
import { useTransactions } from '@/hooks/use-transactions'
import type { CreateTransactionInput } from '@/lib/validations/finance'

interface TransactionListProps {
  initialTransactions: Transaction[]
  wallets: Wallet[]
  categories: FinanceCategory[]
}

export function TransactionList({ initialTransactions, wallets, categories }: TransactionListProps) {
  const {
    transactions,
    totalGastos,
    totalIngresos,
    loading,
    classifying,
    filter,
    updateFilter,
    resetFilter,
    classifyDescription,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions(initialTransactions)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const fmt = (n: number) => new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
  }).format(n)

  const hasActiveFilter = filter.type !== 'todas' || filter.category_id || filter.wallet_id || filter.date_from || filter.date_to

  async function handleSave(data: CreateTransactionInput, autoClassified: boolean) {
    if (editing) {
      await updateTransaction(editing.id, data)
    } else {
      await createTransaction(data, autoClassified)
    }
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este movimiento?')) return
    await deleteTransaction(id)
  }

  function handleEdit(t: Transaction) {
    setEditing(t)
    setShowForm(true)
  }

  return (
    <div>
      {/* Resumen del período */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--success)]/20 bg-[var(--success-muted)] px-4 py-3">
          <p className="lumus-label text-[0.6rem] text-[var(--success)]">INGRESOS</p>
          <p className="lumus-heading mt-1 text-xl font-bold text-[var(--success)]">{fmt(totalIngresos)}</p>
        </div>
        <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.08] px-4 py-3">
          <p className="lumus-label text-[0.6rem] text-[var(--danger)]">GASTOS</p>
          <p className="lumus-heading mt-1 text-xl font-bold text-[var(--danger)]">{fmt(totalGastos)}</p>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
            hasActiveFilter
              ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
              : 'border-white/10 text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)]'
          }`}
        >
          <Filter size={13} />
          Filtros
          {hasActiveFilter && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-lumus)] text-[0.6rem] text-white">
              !
            </span>
          )}
        </button>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          disabled={loading || wallets.length === 0}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          <Plus size={14} />
          Nuevo movimiento
        </button>
      </div>

      {/* Filtros expandibles */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="lumus-label mb-1 block text-[0.6rem] text-[var(--text-muted)]">TIPO</label>
              <select
                value={filter.type}
                onChange={e => updateFilter({ type: e.target.value as typeof filter.type })}
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-2 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <option value="todas">Todos</option>
                <option value="gasto">Gastos</option>
                <option value="ingreso">Ingresos</option>
                <option value="transferencia">Transferencias</option>
              </select>
            </div>
            <div>
              <label className="lumus-label mb-1 block text-[0.6rem] text-[var(--text-muted)]">CATEGORÍA</label>
              <select
                value={filter.category_id ?? ''}
                onChange={e => updateFilter({ category_id: e.target.value || null })}
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-2 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <option value="">Todas</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="lumus-label mb-1 block text-[0.6rem] text-[var(--text-muted)]">DESDE</label>
              <input
                type="date"
                value={filter.date_from ?? ''}
                onChange={e => updateFilter({ date_from: e.target.value || null })}
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-2 py-1.5 text-xs text-[var(--text-primary)] [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="lumus-label mb-1 block text-[0.6rem] text-[var(--text-muted)]">HASTA</label>
              <input
                type="date"
                value={filter.date_to ?? ''}
                onChange={e => updateFilter({ date_to: e.target.value || null })}
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-2 py-1.5 text-xs text-[var(--text-primary)] [color-scheme:dark]"
              />
            </div>
          </div>
          {hasActiveFilter && (
            <button
              onClick={resetFilter}
              className="mt-3 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
            >
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {wallets.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">Primero creá una billetera para registrar movimientos.</p>
        </div>
      )}

      {wallets.length > 0 && transactions.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            {hasActiveFilter ? 'Sin resultados para ese filtro.' : 'Todavía no hay movimientos.'}
          </p>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="space-y-2">
          {transactions.map(t => (
            <TransactionItem
              key={t.id}
              transaction={t}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showForm && (
        <TransactionForm
          wallets={wallets}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onClassify={classifyDescription}
          initial={editing ?? undefined}
        />
      )}

      {classifying && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-[var(--accent-lumus)]/30 bg-[#111118] px-4 py-2 text-xs text-[var(--accent-lumus)] shadow-lg">
          ✦ Lumus está clasificando...
        </div>
      )}
    </div>
  )
}
