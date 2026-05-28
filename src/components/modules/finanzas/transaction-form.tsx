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
      date:        initial?.date        ?? defaultDate ?? new Date().toISOString().slice(0, 10),
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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass w-full max-w-md rounded-t-2xl rounded-b-none p-5 max-h-[92vh] overflow-y-auto sm:rounded-2xl sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
            {initial ? 'Editar movimiento' : 'Nuevo movimiento'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

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

          {/* Descripción */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">DESCRIPCIÓN</label>
            <input
              {...register('description')}
              placeholder="Ej: Almuerzo en el trabajo"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
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

          {/* Categoría con buscador — solo para gasto/ingreso */}
          {watchedType !== 'transferencia' && (
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">CATEGORÍA</label>

              {/* Buscador */}
              <div className="relative mb-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={e => setCategorySearch(e.target.value)}
                  placeholder="Buscar categoría..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
                />
              </div>

              {/* Chips de categoría */}
              <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                {/* Sin categoría */}
                <button
                  type="button"
                  onClick={() => setValue('category_id', null)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    !watchedCategoryId
                      ? 'border-white/20 bg-white/10 text-[var(--text-primary)]'
                      : 'border-white/[0.07] text-[var(--text-muted)] hover:border-white/15 hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Sin categoría
                </button>

                {visibleCategories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setValue('category_id', c.id)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      watchedCategoryId === c.id
                        ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                        : 'border-white/[0.07] text-[var(--text-muted)] hover:border-white/15 hover:text-[var(--text-secondary)]'
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
