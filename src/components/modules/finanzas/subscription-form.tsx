'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { createSubscriptionSchema, type CreateSubscriptionInput } from '@/lib/validations/finance'
import type { Subscription, Wallet } from '@/types/finance.types'

const BILLING_CYCLES = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'anual',   label: 'Anual' },
  { value: 'semanal', label: 'Semanal' },
] as const

interface SubscriptionFormProps {
  wallets: Wallet[]
  onSave: (data: CreateSubscriptionInput) => Promise<void>
  onClose: () => void
  initial?: Subscription
}

export function SubscriptionForm({ wallets, onSave, onClose, initial }: SubscriptionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateSubscriptionInput>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: {
      name:          initial?.name          ?? '',
      amount:        initial?.amount        ?? undefined,
      currency:      initial?.currency      ?? 'ARS',
      billing_cycle: initial?.billing_cycle ?? 'mensual',
      variable:      initial?.variable      ?? false,
      wallet_id:     initial?.wallet_id     ?? null,
      next_billing:  initial?.next_billing  ?? null,
      icon:          initial?.icon          ?? null,
    },
  })

  const selectedCycle    = watch('billing_cycle')
  const isVariable       = watch('variable')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass w-full max-w-md rounded-t-2xl rounded-b-none p-5 max-h-[92vh] overflow-y-auto sm:rounded-2xl sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
            {initial ? 'Editar vencimiento' : 'Nuevo vencimiento'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10"
          >
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
              placeholder="Ej: Netflix, Spotify, Expensas..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[var(--danger)]">{errors.name.message}</p>
            )}
          </div>

          {/* Tipo de monto: fijo / variable */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              TIPO DE MONTO
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValue('variable', false)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  !isVariable
                    ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                    : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                }`}
              >
                Fijo
              </button>
              <button
                type="button"
                onClick={() => setValue('variable', true)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  isVariable
                    ? 'border-[var(--warning)] bg-[var(--warning)]/10 text-[var(--warning)]'
                    : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                }`}
              >
                Variable
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                {isVariable ? 'MONTO TÍPICO (ref.)' : 'MONTO'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">$</span>
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-7 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-xs text-[var(--danger)]">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                MONEDA
              </label>
              <input
                {...register('currency')}
                maxLength={3}
                placeholder="ARS"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm uppercase text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              CICLO DE COBRO
            </label>
            <div className="flex gap-2">
              {BILLING_CYCLES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setValue('billing_cycle', c.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    selectedCycle === c.value
                      ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                      : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              PRÓXIMO VENCIMIENTO <span className="text-[var(--text-muted)] normal-case">(opcional)</span>
            </label>
            <input
              {...register('next_billing')}
              type="date"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none [color-scheme:dark]"
            />
          </div>

          {wallets.length > 0 && (
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                BILLETERA <span className="text-[var(--text-muted)] normal-case">(opcional)</span>
              </label>
              <select
                {...register('wallet_id')}
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
              >
                <option value="">Sin billetera</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
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
              {isSubmitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear vencimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
