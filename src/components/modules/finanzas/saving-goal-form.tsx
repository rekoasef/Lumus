'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { createSavingGoalSchema, type CreateSavingGoalInput } from '@/lib/validations/finance'
import type { SavingGoal, Wallet } from '@/types/finance.types'

interface SavingGoalFormProps {
  wallets: Wallet[]
  onSave: (data: CreateSavingGoalInput) => Promise<void>
  onClose: () => void
  initial?: SavingGoal
}

export function SavingGoalForm({ wallets, onSave, onClose, initial }: SavingGoalFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateSavingGoalInput>({
    resolver: zodResolver(createSavingGoalSchema),
    defaultValues: {
      name:          initial?.name          ?? '',
      target_amount: initial?.target_amount ?? undefined,
      wallet_ids:    initial?.wallet_ids    ?? [],
      target_date:   initial?.target_date   ?? null,
      icon:          initial?.icon          ?? null,
    },
  })

  const selectedWalletIds = watch('wallet_ids') ?? []

  function toggleWallet(id: string) {
    setValue(
      'wallet_ids',
      selectedWalletIds.includes(id)
        ? selectedWalletIds.filter(w => w !== id)
        : [...selectedWalletIds, id],
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass w-full max-w-md rounded-t-2xl rounded-b-none p-5 max-h-[92vh] overflow-y-auto sm:rounded-2xl sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
            {initial ? 'Editar meta' : 'Nueva meta de ahorro'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              NOMBRE
            </label>
            <input
              {...register('name')}
              placeholder="Ej: Viaje a Europa, Auto nuevo..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[var(--danger)]">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              MONTO OBJETIVO
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">$</span>
              <input
                {...register('target_amount', { valueAsNumber: true })}
                type="number"
                step="1"
                min="1"
                placeholder="0"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-7 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
              />
            </div>
            {errors.target_amount && (
              <p className="mt-1 text-xs text-[var(--danger)]">{errors.target_amount.message}</p>
            )}
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              FECHA OBJETIVO{' '}
              <span className="normal-case font-normal text-[var(--text-muted)]">(opcional)</span>
            </label>
            <input
              {...register('target_date')}
              type="date"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none [color-scheme:dark]"
            />
          </div>

          {wallets.length > 0 && (
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                BILLETERAS{' '}
                <span className="normal-case font-normal text-[var(--text-muted)]">
                  (opcional — el progreso será la suma de las que elijas)
                </span>
              </label>
              <div className="space-y-1.5">
                {wallets.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWallet(w.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selectedWalletIds.includes(w.id)
                        ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                        : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                    }`}
                  >
                    <span>{w.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">{w.currency}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[var(--accent-lumus)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
