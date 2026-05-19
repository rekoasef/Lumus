'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { createWalletSchema, type CreateWalletInput } from '@/lib/validations/finance'
import type { Wallet } from '@/types/finance.types'

const WALLET_TYPES = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'banco',    label: 'Banco' },
  { value: 'virtual',  label: 'Virtual' },
] as const

const PRESET_COLORS = [
  '#6366f1', '#22c55e', '#f97316', '#3b82f6',
  '#a855f7', '#ec4899', '#14b8a6', '#eab308',
]

interface WalletFormProps {
  onSave: (data: CreateWalletInput) => Promise<void>
  onClose: () => void
  initial?: Wallet
}

export function WalletForm({ onSave, onClose, initial }: WalletFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateWalletInput>({
    resolver: zodResolver(createWalletSchema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? 'efectivo',
      balance: initial?.balance ?? 0,
      currency: initial?.currency ?? 'ARS',
      color: initial?.color ?? '#6366f1',
      icon: initial?.icon ?? null,
    },
  })

  const selectedColor = watch('color')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="lumus-glass w-full max-w-md rounded-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
            {initial ? 'Editar billetera' : 'Nueva billetera'}
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
              placeholder="Ej: Cuenta Galicia"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[var(--danger)]">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              TIPO
            </label>
            <div className="flex gap-2">
              {WALLET_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setValue('type', t.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    watch('type') === t.value
                      ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                      : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {!initial && (
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                BALANCE INICIAL
              </label>
              <input
                {...register('balance', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              COLOR
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                    selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111118]' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
            </div>
          </div>

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
              {isSubmitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear billetera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
