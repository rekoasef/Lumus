'use client'

import { useState } from 'react'
import { Plus, Repeat, Play, Pencil, Trash2, Power } from 'lucide-react'
import type { RecurringTransaction, Wallet, FinanceCategory } from '@/types/finance.types'
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions'
import { RecurringTransactionForm } from './recurring-transaction-form'
import type { CreateRecurringTransactionInput } from '@/lib/validations/finance'
import type { Transaction } from '@/types/finance.types'
import type { Wallet as WalletFull } from '@/types/finance.types'
import { CategoryIcon } from '@/lib/utils/category-icons'
import { confirm } from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format-currency'
import { monthlyRecurringAmount } from '@/lib/finance/rules'

const REPEAT_LABELS: Record<string, string> = {
  daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual',
}

function fmt(n: number) {
  return formatCurrency(n, 'ARS', 'auto')
}

function getNextLabel(dateStr: string): { label: string; color: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next = new Date(dateStr + 'T12:00:00')
  const diff = Math.round((next.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return { label: 'Vencida', color: 'var(--danger)' }
  if (diff === 0) return { label: 'Hoy', color: 'var(--danger)' }
  if (diff === 1) return { label: 'Mañana', color: '#fb923c' }
  if (diff <= 7)  return { label: `En ${diff} días`, color: '#fb923c' }
  return {
    label: new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
    color: 'var(--text-muted)',
  }
}

interface RecurringTransactionListProps {
  initialRecurring: RecurringTransaction[]
  wallets: Wallet[]
  categories: FinanceCategory[]
  onTransactionApplied: (tx: Transaction, wallet?: Pick<WalletFull, 'id' | 'name' | 'type' | 'balance' | 'currency' | 'color' | 'icon' | 'created_at' | 'updated_at'>) => void
}

export function RecurringTransactionList({
  initialRecurring,
  wallets,
  categories,
  onTransactionApplied,
}: RecurringTransactionListProps) {
  const { recurring, loading, create, update, remove, toggleActive, apply } =
    useRecurringTransactions(initialRecurring, { onTransactionCreated: onTransactionApplied })

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<RecurringTransaction | null>(null)

  async function handleSave(data: CreateRecurringTransactionInput) {
    if (editing) {
      await update(editing.id, data)
      toast.success('Recurrente actualizada')
    } else {
      await create(data)
      toast.success('Recurrente creada')
    }
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ description: '¿Eliminar esta transacción recurrente?' })
    if (!ok) return
    await remove(id)
    toast.success('Eliminada')
  }

  async function handleApply(id: string) {
    const result = await apply(id)
    if (result) toast.success('Transacción registrada')
    else toast.error('No se pudo registrar')
  }

  const active   = recurring.filter(r => r.active)
  const inactive = recurring.filter(r => !r.active)
  const activeExpenses = active.filter(r => r.type === 'gasto')
  const activeIncome = active.filter(r => r.type === 'ingreso')
  const monthlyExpenses = activeExpenses.reduce((sum, r) => sum + monthlyRecurringAmount(r.amount, r.repeat_type), 0)
  const monthlyIncome = activeIncome.reduce((sum, r) => sum + monthlyRecurringAmount(r.amount, r.repeat_type), 0)
  const dueSoonCount = active.filter(r => {
    const next = new Date(r.next_date + 'T12:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.round((next.getTime() - today.getTime()) / 86400000)
    return diff <= 7
  }).length

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
            Fijos y recurrentes
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Sueldo, alquiler, servicios, cuotas y suscripciones
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          disabled={loading || wallets.length === 0}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          <Plus size={15} />
          Nueva
        </button>
      </div>

      {recurring.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="text-[0.58rem] uppercase tracking-wider text-[var(--text-muted)]">Gastos fijos</p>
            <p className="mt-1 text-sm font-bold text-[var(--danger)]">{fmt(monthlyExpenses)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="text-[0.58rem] uppercase tracking-wider text-[var(--text-muted)]">Ingresos fijos</p>
            <p className="mt-1 text-sm font-bold text-[var(--success)]">{fmt(monthlyIncome)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="text-[0.58rem] uppercase tracking-wider text-[var(--text-muted)]">Próximos</p>
            <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">{dueSoonCount}</p>
          </div>
        </div>
      )}

      {wallets.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">Primero creá una billetera.</p>
        </div>
      )}

      {wallets.length > 0 && recurring.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <Repeat size={32} className="mx-auto mb-3 text-[var(--text-muted)]/40" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Sin pagos fijos todavía</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]/60">
            Creá tu sueldo, alquiler o cualquier movimiento que se repite
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-sm text-[var(--accent-lumus)] hover:underline"
          >
            Crear la primera
          </button>
        </div>
      )}

      {/* Activas */}
      {active.length > 0 && (
        <div className="space-y-2">
          {active.map(r => <RecurringCard key={r.id} r={r} onApply={handleApply} onEdit={() => { setEditing(r); setShowForm(true) }} onDelete={handleDelete} onToggle={toggleActive} />)}
        </div>
      )}

      {/* Pausadas */}
      {inactive.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Pausadas</p>
          <div className="space-y-2 opacity-50">
            {inactive.map(r => <RecurringCard key={r.id} r={r} onApply={handleApply} onEdit={() => { setEditing(r); setShowForm(true) }} onDelete={handleDelete} onToggle={toggleActive} />)}
          </div>
        </div>
      )}

      {showForm && (
        <RecurringTransactionForm
          wallets={wallets}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          initial={editing ?? undefined}
        />
      )}
    </div>
  )
}

function RecurringCard({
  r,
  onApply,
  onEdit,
  onDelete,
  onToggle,
}: {
  r: RecurringTransaction
  onApply: (id: string) => void
  onEdit: () => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
}) {
  const isGasto = r.type === 'gasto'
  const { label, color } = getNextLabel(r.next_date)
  const catColor = r.category?.color ?? (isGasto ? 'var(--danger)' : 'var(--success)')

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 sm:px-4">
      {/* Ícono */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: `${catColor}18` }}
      >
        {r.category?.icon
          ? <CategoryIcon icon={r.category.icon} size={16} style={{ color: catColor }} />
          : <Repeat size={16} style={{ color: catColor }} />
        }
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {r.description ?? (isGasto ? 'Gasto recurrente' : 'Ingreso recurrente')}
          </p>
          <span className="shrink-0 rounded-full border border-white/[0.08] px-1.5 py-0.5 text-[0.55rem] font-medium text-[var(--text-muted)]">
            {REPEAT_LABELS[r.repeat_type]}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {r.category && (
            <span className="text-[0.6rem]" style={{ color: catColor }}>{r.category.name}</span>
          )}
          <span className="text-[0.6rem] text-[var(--text-muted)]">· {r.wallet?.name}</span>
          <span className="text-[0.6rem] font-semibold" style={{ color }}>{label}</span>
        </div>
      </div>

      {/* Monto */}
      <p
        className="lumus-heading shrink-0 text-sm font-bold sm:text-base"
        style={{ color: isGasto ? 'var(--danger)' : 'var(--success)' }}
      >
        {isGasto ? '−' : '+'}{fmt(r.amount)}
      </p>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={() => onApply(r.id)}
          title="Registrar ahora"
          className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--accent-lumus)]/10 hover:text-[var(--accent-lumus)] active:bg-[var(--accent-lumus)]/10 sm:p-1.5"
        >
          <Play size={13} />
        </button>
        <button
          onClick={() => onToggle(r.id)}
          title={r.active ? 'Pausar' : 'Activar'}
          className="rounded-md p-2 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] sm:p-1.5"
        >
          <Power size={13} />
        </button>
        <button
          onClick={onEdit}
          className="rounded-md p-2 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] sm:p-1.5"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(r.id)}
          className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] sm:p-1.5"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
