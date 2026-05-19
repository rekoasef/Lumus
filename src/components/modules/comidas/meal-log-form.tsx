'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { createMealLogSchema, type CreateMealLogInput } from '@/lib/validations/food'
import type { Recipe, MealType } from '@/types/food.types'

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'merienda', label: 'Merienda' },
  { value: 'cena', label: 'Cena' },
]

interface MealLogFormProps {
  date: string
  defaultMealType?: MealType
  recipes: Recipe[]
  onSave: (data: CreateMealLogInput) => Promise<boolean>
  onClose: () => void
}

export function MealLogForm({ date, defaultMealType = 'almuerzo', recipes, onSave, onClose }: MealLogFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [useRecipe, setUseRecipe] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateMealLogInput>({
    resolver: zodResolver(createMealLogSchema),
    defaultValues: { date, meal_type: defaultMealType },
  })

  const selectedRecipeId = watch('recipe_id')

  function handleRecipeChange(id: string) {
    setValue('recipe_id', id || null)
    const recipe = recipes.find(r => r.id === id)
    if (recipe) {
      setValue('name', recipe.title)
      setValue('calories', recipe.calories ?? undefined)
    }
  }

  async function onSubmit(data: CreateMealLogInput) {
    setIsSaving(true)
    const ok = await onSave(data)
    setIsSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />

      <div
        className="relative w-full max-w-sm rounded-2xl"
        style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Registrar comida</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Meal type */}
          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Momento del día</label>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_TYPES.map(({ value, label }) => {
                const current = watch('meal_type')
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('meal_type', value)}
                    className={`rounded-lg py-2 text-xs transition-colors ${
                      current === value
                        ? 'bg-[var(--accent-lumus)] text-white'
                        : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Recipe toggle */}
          {recipes.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setUseRecipe(u => !u); setValue('recipe_id', null) }}
                className={`h-5 w-9 rounded-full transition-colors ${useRecipe ? 'bg-[var(--accent-lumus)]' : 'bg-white/10'}`}
              >
                <div className={`h-4 w-4 rounded-full bg-white transition-transform mx-0.5 ${useRecipe ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <span className="text-xs text-[var(--text-muted)]">Usar una receta guardada</span>
            </div>
          )}

          {useRecipe && recipes.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Receta</label>
              <select
                value={selectedRecipeId ?? ''}
                onChange={e => handleRecipeChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0d0d14] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
              >
                <option value="">Seleccionar receta...</option>
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Nombre {!useRecipe && '*'}</label>
            <input
              {...register('name')}
              placeholder="¿Qué comiste?"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
            />
            {errors.name && <p className="mt-1 text-[0.7rem] text-red-400">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Calorías (opcional)</label>
            <input
              type="number"
              step="1"
              min="0"
              {...register('calories', { setValueAs: v => v === '' ? null : parseInt(v, 10) })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Notas (opcional)</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-xl bg-[#f97316] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#ea6c0c] disabled:opacity-40"
            >
              {isSaving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
