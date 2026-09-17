'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Budget, FinanceCategory } from '@/types/finance.types'
import type { CreateBudgetInput } from '@/lib/validations/finance'
import { BudgetCard } from './budget-card'
import { BudgetForm } from './budget-form'
import { FinanzasPageHeader, FinanzasPageShell } from './finanzas-page-header'
import { useBudgets } from '@/hooks/use-budgets'
import { confirm } from '@/components/shared/confirm-dialog'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface PresupuestosViewProps {
  initialBudgets: Budget[]
  initialCategories: FinanceCategory[]
  initialMonth: number
  initialYear: number
}

export function PresupuestosView({
  initialBudgets,
  initialCategories,
  initialMonth,
  initialYear,
}: PresupuestosViewProps) {
  const { budgets, month, year, loading, autoCopied, refresh, createBudget, updateBudget, deleteBudget } =
    useBudgets(initialBudgets, initialMonth, initialYear)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)

  function navigateMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    refresh(m, y)
  }

  async function handleSave(data: CreateBudgetInput) {
    try {
      if (editing) {
        await updateBudget(editing.id, { amount: data.amount })
        toast.success('Presupuesto actualizado')
      } else {
        await createBudget(data)
        toast.success('Presupuesto creado')
      }
    } catch (e) {
      // El formulario queda abierto con lo cargado, para corregir y reintentar.
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el presupuesto')
      return
    }
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ description: '¿Eliminar este presupuesto?' })
    if (!ok) return
    try {
      await deleteBudget(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el presupuesto')
      return
    }
    toast.success('Presupuesto eliminado')
  }

  return (
    <FinanzasPageShell>
      <FinanzasPageHeader
        title="Presupuestos"
        description="Cuánto te propusiste gastar por categoría, y cuánto va."
        action={
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            <Plus size={16} />
            Nuevo presupuesto
          </button>
        }
      />

      <div className="mb-5 flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-1 py-0.5 w-fit">
        <button
          onClick={() => navigateMonth(-1)}
          className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="lumus-label min-w-[110px] text-center text-[0.68rem] font-medium text-[var(--text-secondary)]">
          {MONTHS[month - 1]} {year}
        </span>
        <button
          onClick={() => navigateMonth(1)}
          className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {autoCopied && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--accent-lumus)]/20 bg-[var(--accent-muted)] px-4 py-2.5 text-xs text-[var(--accent-lumus)]">
          <span>✦</span>
          <span>Presupuestos copiados del mes anterior. Podés editarlos o eliminarlos para este mes.</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="lumus-glass h-40 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="lumus-glass rounded-2xl py-20 text-center">
          <p className="text-[var(--text-muted)]">No hay presupuestos para {MONTHS[month - 1].toLowerCase()} {year}.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-sm text-[var(--accent-lumus)] hover:underline"
          >
            Crear el primer presupuesto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map(budget => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={b => { setEditing(b); setShowForm(true) }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showForm && (
        <BudgetForm
          categories={initialCategories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          initial={editing ?? undefined}
        />
      )}
    </FinanzasPageShell>
  )
}
