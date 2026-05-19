'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createTransactionSchema, type CreateTransactionInput } from '@/lib/validations/finance'
import type { Transaction, Wallet, FinanceCategory } from '@/types/finance.types'

interface TransactionFormProps {
  wallets: Wallet[]
  categories: FinanceCategory[]
  onSave: (data: CreateTransactionInput, autoClassified: boolean) => Promise<void>
  onClose: () => void
  onClassify: (description: string, amount: number, type: 'gasto' | 'ingreso') => Promise<{ category_id: string | null; confidence: number }>
  initial?: Transaction
}

export function TransactionForm({
  wallets,
  categories,
  onSave,
  onClose,
  onClassify,
  initial,
}: TransactionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      wallet_id: initial?.wallet_id ?? wallets[0]?.id ?? '',
      category_id: initial?.category_id ?? null,
      type: initial?.type ?? 'gasto',
      amount: initial?.amount ?? undefined,
      description: initial?.description ?? '',
      date: initial?.date ?? new Date().toISOString().slice(0, 10),
    },
  })

  const [autoClassified, setAutoClassified] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const classifyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const watchedType = watch('type')
  const watchedDescription = watch('description')
  const watchedAmount = watch('amount')

  const filteredCategories = categories.filter(c => c.type === watchedType)

  // Autocompletar categoría cuando hay descripción + monto + tipo
  useEffect(() => {
    if (!watchedDescription || watchedDescription.length < 3) return
    if (!watchedAmount || watchedAmount <= 0) return
    if (watchedType === 'transferencia') return
    if (initial) return // No reclasificar en edición

    if (classifyTimeout.current) clearTimeout(classifyTimeout.current)

    classifyTimeout.current = setTimeout(async () => {
      setClassifying(true)
      const result = await onClassify(watchedDescription, watchedAmount, watchedType as 'gasto' | 'ingreso')
      setClassifying(false)

      if (result.category_id && result.confidence >= 0.65) {
        setValue('category_id', result.category_id)
        setAutoClassified(true)
        setAiConfidence(result.confidence)
      }
    }, 700)

    return () => { if (classifyTimeout.current) clearTimeout(classifyTimeout.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedDescription, watchedAmount, watchedType])

  async function handleFormSave(data: CreateTransactionInput) {
    await onSave(data, autoClassified)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="lumus-glass w-full max-w-md rounded-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
            {initial ? 'Editar movimiento' : 'Nuevo movimiento'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSave)} className="space-y-4">

          {/* Tipo */}
          <div className="flex gap-2">
            {(['gasto', 'ingreso', 'transferencia'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setValue('type', t); setAutoClassified(false); setAiConfidence(null) }}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors ${
                  watchedType === t
                    ? t === 'gasto'
                      ? 'border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]'
                      : t === 'ingreso'
                        ? 'border-[var(--success)] bg-[var(--success-muted)] text-[var(--success)]'
                        : 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                    : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Monto */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">MONTO</label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.amount && <p className="mt-1 text-xs text-[var(--danger)]">{errors.amount.message}</p>}
          </div>

          {/* Descripción con trigger de IA */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              DESCRIPCIÓN
            </label>
            <div className="relative">
              <input
                {...register('description')}
                placeholder="Ej: Almuerzo en el trabajo"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 pr-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
              />
              {classifying && (
                <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-[var(--accent-lumus)]" />
              )}
            </div>
          </div>

          {/* Billetera */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">BILLETERA</label>
            <select
              {...register('wallet_id')}
              className="w-full rounded-lg border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
            >
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            {errors.wallet_id && <p className="mt-1 text-xs text-[var(--danger)]">{errors.wallet_id.message}</p>}
          </div>

          {/* Categoría — solo para gasto/ingreso */}
          {watchedType !== 'transferencia' && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="lumus-label text-[0.65rem] text-[var(--text-muted)]">CATEGORÍA</label>
                {autoClassified && aiConfidence !== null && (
                  <span className="flex items-center gap-1 text-[0.6rem] text-[var(--accent-lumus)]">
                    <Sparkles size={10} />
                    IA ({Math.round(aiConfidence * 100)}%)
                  </span>
                )}
              </div>
              <select
                {...register('category_id')}
                onChange={e => { setValue('category_id', e.target.value || null); setAutoClassified(false) }}
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
              >
                <option value="">Sin categoría</option>
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Fecha */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">FECHA</label>
            <input
              {...register('date')}
              type="date"
              className="w-full rounded-lg border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none [color-scheme:dark]"
            />
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
              {isSubmitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
