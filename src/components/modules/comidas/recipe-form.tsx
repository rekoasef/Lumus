'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { createRecipeSchema, type CreateRecipeInput } from '@/lib/validations/food'

interface RecipeFormProps {
  onSave: (data: CreateRecipeInput) => Promise<boolean>
  onGenerate: (prompt: string) => Promise<unknown>
  onClose: () => void
}

export function RecipeForm({ onSave, onGenerate, onClose }: RecipeFormProps) {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { register, control, handleSubmit, formState: { errors } } = useForm<CreateRecipeInput>({
    resolver: zodResolver(createRecipeSchema),
    defaultValues: { ingredients: [{ name: '', quantity: '', unit: '' }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ingredients' })

  async function onSubmit(data: CreateRecipeInput) {
    setIsSaving(true)
    const ok = await onSave(data)
    setIsSaving(false)
    if (ok) onClose()
  }

  async function handleGenerate() {
    if (!aiPrompt.trim()) return
    setIsGenerating(true)
    const ok = await onGenerate(aiPrompt.trim())
    setIsGenerating(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />

      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4" style={{ background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Nueva receta</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-5 pt-4">
          <div className="flex rounded-xl bg-white/5 p-1">
            {(['manual', 'ai'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                  mode === m
                    ? 'bg-[var(--accent-lumus)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {m === 'manual' ? 'Manual' : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Sparkles size={11} />
                    Generar con IA
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {mode === 'ai' ? (
          <div className="p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-[var(--text-muted)]">
                Describí la receta que querés
              </label>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Ej: Una pasta con pollo y verduras, sin gluten, alta en proteínas..."
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={!aiPrompt.trim() || isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-lumus)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generar receta
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Título *</label>
              <input
                {...register('title')}
                placeholder="Nombre de la receta"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
              />
              {errors.title && <p className="mt-1 text-[0.7rem] text-red-400">{errors.title.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Descripción</label>
              <textarea
                {...register('description')}
                rows={2}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
              />
            </div>

            {/* Ingredientes */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs text-[var(--text-muted)]">Ingredientes</label>
                <button
                  type="button"
                  onClick={() => append({ name: '', quantity: '', unit: '' })}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[0.7rem] text-[var(--accent-lumus)] hover:bg-[var(--accent-muted)]"
                >
                  <Plus size={11} />
                  Agregar
                </button>
              </div>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={field.id} className="flex gap-2">
                    <input
                      {...register(`ingredients.${i}.name`)}
                      placeholder="Ingrediente"
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
                    />
                    <input
                      {...register(`ingredients.${i}.quantity`)}
                      placeholder="Cant."
                      className="w-16 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
                    />
                    <input
                      {...register(`ingredients.${i}.unit`)}
                      placeholder="Unidad"
                      className="w-20 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
                    />
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Preparación</label>
              <textarea
                {...register('instructions')}
                rows={4}
                placeholder="Pasos de preparación..."
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
              />
            </div>

            {/* Macros */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'calories' as const, label: 'Calorías (kcal)', isInt: true },
                { name: 'prep_time_min' as const, label: 'Tiempo prep. (min)', isInt: true },
                { name: 'protein_g' as const, label: 'Proteínas (g)', isInt: false },
                { name: 'carbs_g' as const, label: 'Carbohidratos (g)', isInt: false },
                { name: 'fat_g' as const, label: 'Grasas (g)', isInt: false },
              ].map(f => (
                <div key={f.name}>
                  <label className="mb-1.5 block text-xs text-[var(--text-muted)]">{f.label}</label>
                  <input
                    type="number"
                    step={f.isInt ? '1' : '0.1'}
                    min="0"
                    {...register(f.name, { setValueAs: v => v === '' ? null : (f.isInt ? parseInt(v, 10) : parseFloat(v)) })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
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
                className="flex-1 rounded-xl bg-[var(--accent-lumus)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
              >
                {isSaving ? 'Guardando...' : 'Guardar receta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
