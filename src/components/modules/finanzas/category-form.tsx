'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { createCategorySchema, type CreateCategoryInput } from '@/lib/validations/finance'
import type { FinanceCategory } from '@/types/finance.types'

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#a855f7', '#ef4444',
  '#22c55e', '#ec4899', '#06b6d4', '#eab308',
  '#6366f1', '#84cc16', '#14b8a6', '#64748b',
]

const PRESET_ICONS = [
  'utensils', 'car', 'home', 'heart-pulse',
  'graduation-cap', 'shirt', 'laptop', 'repeat',
  'banknote', 'briefcase', 'trending-up', 'wallet',
  'gamepad-2', 'plane', 'shopping-cart', 'gift',
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
      name: initial?.name ?? '',
      type: initial?.type ?? defaultType,
      color: initial?.color ?? '#6366f1',
      icon: initial?.icon ?? null,
    },
  })

  const selectedColor = watch('color')
  const selectedIcon = watch('icon')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="lumus-glass w-full max-w-md rounded-2xl p-6">
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

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
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
                    watch('type') === t
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
              ÍCONO (nombre de Lucide)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setValue('icon', selectedIcon === icon ? null : icon)}
                  className={`rounded-md border px-2 py-1 text-[0.65rem] transition-colors ${
                    selectedIcon === icon
                      ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                      : 'border-white/10 text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {icon}
                </button>
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
              {isSubmitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
