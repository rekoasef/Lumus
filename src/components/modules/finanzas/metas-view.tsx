'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { SavingGoal, Wallet } from '@/types/finance.types'
import type { CreateSavingGoalInput } from '@/lib/validations/finance'
import { SavingGoalCard } from './saving-goal-card'
import { SavingGoalForm } from './saving-goal-form'
import { FinanzasPageHeader, FinanzasPageShell } from './finanzas-page-header'
import { useSavingGoals } from '@/hooks/use-saving-goals'
import { useExchangeRates } from '@/hooks/use-exchange-rates'
import { confirm } from '@/components/shared/confirm-dialog'

interface MetasViewProps {
  initialGoals: SavingGoal[]
  wallets: Wallet[]
}

export function MetasView({ initialGoals, wallets }: MetasViewProps) {
  const { goals, loading, createGoal, updateGoal, deleteGoal, contribute, markAchieved } =
    useSavingGoals(initialGoals)
  const { toARS } = useExchangeRates()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SavingGoal | null>(null)

  async function handleSave(data: CreateSavingGoalInput) {
    try {
      if (editing) {
        await updateGoal(editing.id, data)
        toast.success('Meta actualizada')
      } else {
        await createGoal(data)
        toast.success('Meta creada')
      }
    } catch (e) {
      // El formulario queda abierto con lo cargado, para corregir y reintentar.
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar la meta')
      return
    }
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ description: '¿Eliminar esta meta de ahorro?' })
    if (!ok) return
    try {
      await deleteGoal(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar la meta')
      return
    }
    toast.success('Meta eliminada')
  }

  return (
    <FinanzasPageShell>
      <FinanzasPageHeader
        title="Metas de ahorro"
        description="Para qué estás juntando, y cuánto te falta."
        action={
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            <Plus size={16} />
            Nueva meta
          </button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="lumus-glass h-48 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="lumus-glass rounded-2xl py-20 text-center">
          <p className="text-[var(--text-muted)]">No hay metas de ahorro todavía.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-sm text-[var(--accent-lumus)] hover:underline"
          >
            Crear la primera meta
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map(goal => (
            <SavingGoalCard
              key={goal.id}
              goal={goal}
              wallets={wallets}
              toARS={toARS}
              onEdit={g => { setEditing(g); setShowForm(true) }}
              onDelete={handleDelete}
              onContribute={async (id, amount, walletId) => { await contribute(id, amount, walletId) }}
              onMarkAchieved={async (id) => {
                try {
                  await markAchieved(id)
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'No se pudo marcar la meta como cumplida')
                }
              }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <SavingGoalForm
          wallets={wallets}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          initial={editing ?? undefined}
        />
      )}
    </FinanzasPageShell>
  )
}
