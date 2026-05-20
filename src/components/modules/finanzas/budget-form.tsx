'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Search } from 'lucide-react'
import { createBudgetSchema, type CreateBudgetInput } from '@/lib/validations/finance'
import type { Budget, FinanceCategory } from '@/types/finance.types'
import { CategoryIcon } from '@/lib/utils/category-icons'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface BudgetFormProps {
  categories: FinanceCategory[]
  onSave: (data: CreateBudgetInput) => Promise<void>
  onClose: () => void
  initial?: Budget
}

export function BudgetForm({ categories, onSave, onClose, initial }: BudgetFormProps) {
  const now = new Date()
  const expenseCategories = categories.filter(c => c.type === 'gasto')
  const [search, setSearch] = useState('')

  const filtered = expenseCategories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      category_id: initial?.category_id ?? '',
      amount:      initial?.amount      ?? undefined,
      month:       initial?.month       ?? now.getMonth() + 1,
      year:        initial?.year        ?? now.getFullYear(),
    },
  })

  const selectedCategoryId = watch('category_id')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="lumus-glass w-full max-w-md rounded-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
            {initial ? 'Editar presupuesto' : 'Nuevo presupuesto'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          {initial ? (
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                CATEGORÍA
              </label>
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${initial.category?.color ?? '#7c6dfa'}22` }}
                >
                  <CategoryIcon
                    icon={initial.category?.icon}
                    size={13}
                    style={{ color: initial.category?.color ?? '#7c6dfa' }}
                  />
                </div>
                <span className="text-sm text-[var(--text-secondary)]">
                  {initial.category?.name ?? 'Sin categoría'}
                </span>
              </div>
              <input type="hidden" {...register('category_id')} />
            </div>
          ) : (
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                CATEGORÍA
              </label>

              {/* Buscador */}
              <div className="relative mb-1.5">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar categoría..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
                />
              </div>

              {/* Lista filtrada */}
              <div className="max-h-44 overflow-y-auto space-y-1 rounded-lg border border-white/10 bg-white/5 p-2">
                {filtered.length === 0 ? (
                  <p className="py-3 text-center text-xs text-[var(--text-muted)]">
                    {search ? 'Sin resultados' : 'No hay categorías de gasto disponibles'}
                  </p>
                ) : filtered.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setValue('category_id', cat.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      selectedCategoryId === cat.id
                        ? 'bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                        : 'text-[var(--text-secondary)] hover:bg-white/5'
                    }`}
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${cat.color}22` }}
                    >
                      {cat.icon ? (
                        <CategoryIcon
                          icon={cat.icon}
                          size={13}
                          style={{ color: selectedCategoryId === cat.id ? 'var(--accent-lumus)' : cat.color }}
                        />
                      ) : (
                        <span className="text-[0.6rem] font-bold" style={{ color: cat.color }}>
                          {cat.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    {cat.name}
                  </button>
                ))}
              </div>

              {errors.category_id && (
                <p className="mt-1 text-xs text-[var(--danger)]">{errors.category_id.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              LÍMITE MENSUAL
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                $
              </span>
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                step="1"
                min="1"
                placeholder="0"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-7 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-xs text-[var(--danger)]">{errors.amount.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                MES
              </label>
              <select
                {...register('month', { valueAsNumber: true })}
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
              >
                {MONTHS.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                AÑO
              </label>
              <input
                {...register('year', { valueAsNumber: true })}
                type="number"
                min="2020"
                max="2100"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
              />
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
              {isSubmitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear presupuesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
