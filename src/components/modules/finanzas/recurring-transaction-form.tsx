'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Search } from 'lucide-react'
import { useState } from 'react'
import { createRecurringTransactionSchema, type CreateRecurringTransactionInput } from '@/lib/validations/finance'
import type { RecurringTransaction, Wallet, FinanceCategory } from '@/types/finance.types'
import { CategoryIcon } from '@/lib/utils/category-icons'

const REPEAT_LABELS = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual' }
const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface RecurringTransactionFormProps {
  wallets: Wallet[]
  categories: FinanceCategory[]
  onSave: (data: CreateRecurringTransactionInput) => Promise<void>
  onClose: () => void
  initial?: RecurringTransaction
}

export function RecurringTransactionForm({
  wallets,
  categories,
  onSave,
  onClose,
  initial,
}: RecurringTransactionFormProps) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<CreateRecurringTransactionInput>({
      resolver: zodResolver(createRecurringTransactionSchema),
      defaultValues: {
        wallet_id:   initial?.wallet_id   ?? wallets[0]?.id ?? '',
        category_id: initial?.category_id ?? null,
        type:        initial?.type        ?? 'gasto',
        amount:      initial?.amount      ?? undefined,
        description: initial?.description ?? '',
        repeat_type: initial?.repeat_type ?? 'monthly',
        repeat_day:  initial?.repeat_day  ?? null,
        next_date:   initial?.next_date   ?? todayStr,
      },
    })

  const [categorySearch, setCategorySearch] = useState('')
  const watchedType       = watch('type')
  const watchedRepeat     = watch('repeat_type')
  const watchedCategoryId = watch('category_id')

  const filteredCategories = categories
    .filter(c => c.type === watchedType)
    .filter(c => !categorySearch || c.name.toLowerCase().includes(categorySearch.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass w-full max-w-md rounded-t-3xl rounded-b-none sm:rounded-2xl flex flex-col max-h-[94svh] sm:max-h-[90vh]">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 sm:px-6 sm:pt-5">
          <div>
            <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">
              {initial ? 'Editar recurrente' : 'Nueva recurrente'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Sueldo, alquiler, servicios…</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[var(--text-muted)] hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto px-5 pb-6 sm:px-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">

            {/* Tipo */}
            <div className="flex gap-2">
              {(['gasto', 'ingreso'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setValue('type', t); setValue('category_id', null) }}
                  className={`flex-1 rounded-xl border py-3 text-xs font-semibold capitalize transition-colors sm:py-2 ${
                    watchedType === t
                      ? t === 'gasto'
                        ? 'border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]'
                        : 'border-[var(--success)] bg-[var(--success-muted)] text-[var(--success)]'
                      : 'border-white/10 bg-white/5 text-[var(--text-secondary)]'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Monto */}
            <div>
              <label className="lumus-label mb-2 block text-[0.65rem] text-[var(--text-muted)]">MONTO</label>
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number" inputMode="decimal" step="0.01" placeholder="0.00"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--accent-lumus)] focus:outline-none sm:py-2.5 sm:text-sm"
              />
              {errors.amount && <p className="mt-1.5 text-xs text-[var(--danger)]">{errors.amount.message}</p>}
            </div>

            {/* Descripción */}
            <div>
              <label className="lumus-label mb-2 block text-[0.65rem] text-[var(--text-muted)]">NOMBRE / DESCRIPCIÓN</label>
              <input
                {...register('description')}
                placeholder="Ej: Sueldo, Alquiler, Spotify…"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--accent-lumus)] focus:outline-none sm:py-2.5 sm:text-sm"
              />
            </div>

            {/* Billetera + Próxima fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="lumus-label mb-2 block text-[0.65rem] text-[var(--text-muted)]">BILLETERA</label>
                <select
                  {...register('wallet_id')}
                  className="w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-3.5 text-base text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none sm:py-2.5 sm:text-sm"
                >
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="lumus-label mb-2 block text-[0.65rem] text-[var(--text-muted)]">PRÓXIMA VEZ</label>
                <input
                  {...register('next_date')}
                  type="date"
                  className="w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-3.5 text-base text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none [color-scheme:dark] sm:py-2.5 sm:text-sm"
                />
              </div>
            </div>

            {/* Repetición */}
            <div>
              <label className="lumus-label mb-2 block text-[0.65rem] text-[var(--text-muted)]">SE REPITE</label>
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setValue('repeat_type', r)}
                    className={`flex-1 rounded-xl border py-3 text-xs font-semibold transition-colors sm:py-2 ${
                      watchedRepeat === r
                        ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                        : 'border-white/10 bg-white/5 text-[var(--text-secondary)]'
                    }`}
                  >
                    {REPEAT_LABELS[r]}
                  </button>
                ))}
              </div>

              {/* Día de la semana para weekly */}
              {watchedRepeat === 'weekly' && (
                <div className="mt-2.5 flex gap-1">
                  {WEEK_DAYS.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setValue('repeat_day', i)}
                      className={`flex-1 rounded-lg border py-1.5 text-[0.6rem] font-semibold transition-colors ${
                        watch('repeat_day') === i
                          ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                          : 'border-white/10 text-[var(--text-muted)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Día del mes para monthly */}
              {watchedRepeat === 'monthly' && (
                <div className="mt-2">
                  <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">DÍA DEL MES</label>
                  <input
                    {...register('repeat_day', { valueAsNumber: true })}
                    type="number" min={1} max={31} placeholder="1-31"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-base text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none sm:py-2 sm:text-sm"
                  />
                </div>
              )}
            </div>

            {/* Categoría */}
            <div>
              <label className="lumus-label mb-2 block text-[0.65rem] text-[var(--text-muted)]">CATEGORÍA</label>
              <div className="relative mb-2.5">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text" value={categorySearch} onChange={e => setCategorySearch(e.target.value)}
                  placeholder="Buscar…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--accent-lumus)] focus:outline-none sm:py-2 sm:text-sm"
                />
              </div>
              <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setValue('category_id', null)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:py-1.5 ${!watchedCategoryId ? 'border-white/20 bg-white/10 text-[var(--text-primary)]' : 'border-white/[0.07] text-[var(--text-muted)]'}`}
                >
                  Sin categoría
                </button>
                {filteredCategories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setValue('category_id', c.id)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:py-1.5 ${
                      watchedCategoryId === c.id
                        ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                        : 'border-white/[0.07] text-[var(--text-muted)]'
                    }`}
                  >
                    {c.icon && <CategoryIcon icon={c.icon} size={12} style={{ color: watchedCategoryId === c.id ? 'var(--accent-lumus)' : c.color }} />}
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button" onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 py-3.5 text-sm font-medium text-[var(--text-secondary)] sm:py-2.5"
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[var(--accent-lumus)] py-3.5 text-sm font-semibold text-white disabled:opacity-50 sm:py-2.5"
              >
                {isSubmitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
