'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { createCategorySchema, type CreateCategoryInput } from '@/lib/validations/finance'
import type { FinanceCategory } from '@/types/finance.types'
import { CATEGORY_ICON_MAP, ICON_KEYS, CategoryIcon } from '@/lib/utils/category-icons'

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#a855f7', '#ef4444',
  '#22c55e', '#ec4899', '#06b6d4', '#eab308',
  '#6366f1', '#84cc16', '#14b8a6', '#64748b',
]

interface CategoryFormProps {
  onSave: (data: CreateCategoryInput) => Promise<void>
  onClose: () => void
  initial?: FinanceCategory
  defaultType?: 'gasto' | 'ingreso'
}

export function CategoryForm({ onSave, onClose, initial, defaultType = 'gasto' }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name:  initial?.name  ?? '',
      type:  initial?.type  ?? defaultType,
      color: initial?.color ?? '#6366f1',
      icon:  initial?.icon  ?? null,
    },
  })

  const selectedColor = watch('color')
  const selectedIcon  = watch('icon')
  const selectedType  = watch('type')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass w-full max-w-md rounded-t-2xl rounded-b-none p-5 max-h-[92vh] overflow-y-auto sm:rounded-2xl sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
            {initial ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-5">
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              NOMBRE
            </label>
            <input
              {...register('name')}
              placeholder="Ej: Gimnasio"
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
              {(['gasto', 'ingreso'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue('type', t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    selectedType === t
                      ? t === 'gasto'
                        ? 'border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]'
                        : 'border-[var(--success)] bg-[var(--success-muted)] text-[var(--success)]'
                      : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                  }`}
                >
                  {t === 'gasto' ? 'Gasto' : 'Ingreso'}
                </button>
              ))}
            </div>
          </div>

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
                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                    selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111118]' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              ÍCONO
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {ICON_KEYS.map(key => {
                const isSelected = selectedIcon === key
                return (
                  <button
                    key={key}
                    type="button"
                    title={key}
                    onClick={() => setValue('icon', isSelected ? null : key)}
                    className={`flex items-center justify-center rounded-lg border p-2.5 transition-all hover:scale-105 ${
                      isSelected
                        ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)]'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <CategoryIcon
                      icon={key}
                      size={16}
                      style={{ color: isSelected ? 'var(--accent-lumus)' : selectedColor }}
                    />
                  </button>
                )
              })}
            </div>
            {selectedIcon && (
              <p className="mt-1.5 text-[0.65rem] text-[var(--text-muted)]">
                Seleccionado: <span className="text-[var(--text-secondary)]">{selectedIcon}</span>
                <button
                  type="button"
                  onClick={() => setValue('icon', null)}
                  className="ml-2 text-[var(--danger)] hover:underline"
                >
                  quitar
                </button>
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
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
              {isSubmitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
