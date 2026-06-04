'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Search } from 'lucide-react'
import { useState } from 'react'
import { createTransactionSchema, type CreateTransactionInput } from '@/lib/validations/finance'
import type { Transaction, Wallet, FinanceCategory } from '@/types/finance.types'
import { CategoryIcon } from '@/lib/utils/category-icons'

interface TransactionFormProps {
  wallets: Wallet[]
  categories: FinanceCategory[]
  onSave: (data: CreateTransactionInput) => Promise<void>
  onClose: () => void
  initial?: Transaction
  defaultDate?: string
}

export function TransactionForm({
  wallets,
  categories,
  onSave,
  onClose,
  initial,
  defaultDate,
}: TransactionFormProps) {
  const initialType =
    initial?.type === 'gasto' || initial?.type === 'ingreso' || initial?.type === 'transferencia'
      ? initial.type
      : 'gasto'

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      wallet_id:   initial?.wallet_id   ?? wallets[0]?.id ?? '',
      category_id: initial?.category_id ?? null,
      type:        initialType,
      amount:      initial?.amount      ?? undefined,
      description: initial?.description ?? '',
      date:        initial?.date        ?? defaultDate ?? ((): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(),
    },
  })

  const [categorySearch, setCategorySearch] = useState('')

  const watchedType       = watch('type')
  const watchedCategoryId = watch('category_id')

  const filteredByType = categories.filter(c => c.type === watchedType)
  const visibleCategories = categorySearch.trim()
    ? filteredByType.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
    : filteredByType

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass w-full max-w-md rounded-t-3xl rounded-b-none sm:rounded-2xl flex flex-col max-h-[94svh] sm:max-h-[90vh]">

        {/* Drag handle — solo mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 sm:px-6 sm:pt-5">
          <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
            {initial ? 'Editar movimiento' : 'Nuevo movimiento'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[var(--text-muted)] hover:bg-white/10 active:bg-white/15"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form scrollable */}
        <div className="overflow-y-auto px-5 pb-6 sm:px-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">

            {/* Tipo */}
            <div className="flex gap-2">
              {(['gasto', 'ingreso', 'transferencia'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setValue('type', t)
                    setValue('category_id', null)
                    setCategorySearch('')
                  }}
                  className={`flex-1 rounded-xl border py-3 text-xs font-semibold capitalize transition-colors sm:py-2 ${
                    watchedType === t
                      ? t === 'gasto'
                        ? 'border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]'
                        : t === 'ingreso'
                          ? 'border-[var(--success)] bg-[var(--success-muted)] text-[var(--success)]'
                          : 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                      : 'border-white/10 bg-white/5 text-[var(--text-secondary)]'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Monto — campo principal, más prominente */}
            <div>
              <label className="lumus-label mb-2 block text-[0.65rem] text-[var(--text-muted)]">MONTO</label>
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--accent-lumus)] focus:outline-none sm:py-2.5 sm:text-sm"
              />
              {errors.amount && <p className="mt-1.5 text-xs text-[var(--danger)]">{errors.amount.message}</p>}
            </div>

            {/* Descripción */}
            <div>
              <label className="lumus-label mb-2 block text-[0.65rem] text-[var(--text-muted)]">DESCRIPCIÓN</label>
              <input
                {...register('description')}
                placeholder="Ej: Almuerzo en el trabajo"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--accent-lumus)] focus:outline-none sm:py-2.5 sm:text-sm"
              />
            </div>

            {/* Billetera + Fecha en fila */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="lumus-label mb-2 block text-[0.65rem] text-[var(--text-muted)]">BILLETERA</label>
                <select
                  {...register('wallet_id')}
                  className="w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-3.5 text-base text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none sm:py-2.5 sm:text-sm"
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                {errors.wallet_id && <p className="mt-1 text-xs text-[var(--danger)]">{errors.wallet_id.message}</p>}
              </div>
              <div>
                <label className="lumus-label mb-2 block text-[0.65rem] text-[var(--text-muted)]">FECHA</label>
                <input
                  {...register('date')}
                  type="date"
                  className="w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-3.5 text-base text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none [color-scheme:dark] sm:py-2.5 sm:text-sm"
                />
              </div>
            </div>

            {/* Categoría con buscador — solo para gasto/ingreso */}
            {watchedType !== 'transferencia' && (
              <div>
                <label className="lumus-label mb-2 block text-[0.65rem] text-[var(--text-muted)]">CATEGORÍA</label>

                {/* Buscador */}
                <div className="relative mb-2.5">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={e => setCategorySearch(e.target.value)}
                    placeholder="Buscar categoría..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--accent-lumus)] focus:outline-none sm:py-2 sm:text-sm"
                  />
                </div>

                {/* Chips de categoría */}
                <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto sm:max-h-36">
                  {/* Sin categoría */}
                  <button
                    type="button"
                    onClick={() => setValue('category_id', null)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:py-1.5 ${
                      !watchedCategoryId
                        ? 'border-white/20 bg-white/10 text-[var(--text-primary)]'
                        : 'border-white/[0.07] text-[var(--text-muted)]'
                    }`}
                  >
                    Sin categoría
                  </button>

                  {visibleCategories.map(c => (
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
                      {c.icon && (
                        <CategoryIcon
                          icon={c.icon}
                          size={12}
                          style={{ color: watchedCategoryId === c.id ? 'var(--accent-lumus)' : c.color }}
                        />
                      )}
                      {c.name}
                    </button>
                  ))}

                  {visibleCategories.length === 0 && categorySearch && (
                    <p className="py-2 text-xs text-[var(--text-muted)]">
                      Sin resultados para &quot;{categorySearch}&quot;
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 py-3.5 text-sm font-medium text-[var(--text-secondary)] active:bg-white/5 sm:py-2.5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[var(--accent-lumus)] py-3.5 text-sm font-semibold text-white active:bg-[var(--accent-hover)] disabled:opacity-50 sm:py-2.5"
              >
                {isSubmitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
