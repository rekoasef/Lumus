'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Plus, Trash2 } from 'lucide-react'
import type { Resolver } from 'react-hook-form'
import { createRoutineSchema, type CreateRoutineInput } from '@/lib/validations/fit'
import type { WorkoutExercise } from '@/types/fit.types'

const GOALS = [
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'fuerza',      label: 'Fuerza' },
  { value: 'definicion',  label: 'Definición' },
  { value: 'cardio',      label: 'Cardio' },
] as const

const MUSCLE_GROUPS = [
  { value: 'pecho',     label: 'Pecho' },
  { value: 'espalda',   label: 'Espalda' },
  { value: 'piernas',   label: 'Piernas' },
  { value: 'hombros',   label: 'Hombros' },
  { value: 'brazos',    label: 'Brazos' },
  { value: 'abdomen',   label: 'Abdomen' },
  { value: 'cardio',    label: 'Cardio' },
  { value: 'full_body', label: 'Full body' },
] as const

interface RoutineFormProps {
  exercises: WorkoutExercise[]
  onSave: (data: CreateRoutineInput) => Promise<boolean>
  onCreateExercise: (name: string, muscle_group?: string) => Promise<WorkoutExercise | null>
  onClose: () => void
}

export function RoutineForm({ exercises, onSave, onCreateExercise, onClose }: RoutineFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [newExName, setNewExName] = useState('')
  const [newExMuscle, setNewExMuscle] = useState('')
  const [isCreatingEx, setIsCreatingEx] = useState(false)

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateRoutineInput>({
    resolver: zodResolver(createRoutineSchema) as Resolver<CreateRoutineInput>,
    defaultValues: { exercises: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'exercises' })
  const selectedGoal = watch('goal')

  async function handleCreateExercise() {
    if (!newExName.trim()) return
    setIsCreatingEx(true)
    const ex = await onCreateExercise(newExName.trim(), newExMuscle || undefined)
    if (ex) {
      append({ exercise_id: ex.id, sets: 3, reps: 10, rest_seconds: 60, order_index: fields.length })
      setNewExName('')
      setNewExMuscle('')
    }
    setIsCreatingEx(false)
  }

  async function onSubmit(data: CreateRoutineInput) {
    setIsSaving(true)
    const ok = await onSave(data)
    setIsSaving(false)
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
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Nueva rutina</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Nombre *</label>
            <input
              {...register('name')}
              placeholder="Ej: Tren superior A"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#22d3ee]/50 focus:outline-none"
            />
            {errors.name && <p className="mt-1 text-[0.7rem] text-red-400">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Objetivo</label>
            <div className="grid grid-cols-4 gap-1.5">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setValue('goal', selectedGoal === g.value ? null : g.value)}
                  className={`rounded-lg py-2 text-xs transition-colors ${
                    selectedGoal === g.value
                      ? 'bg-[#22d3ee]/20 text-[#22d3ee]'
                      : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Descripción</label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#22d3ee]/50 focus:outline-none"
            />
          </div>

          {/* Ejercicios */}
          <div>
            <p className="mb-2 text-xs text-[var(--text-muted)]">Ejercicios</p>

            {exercises.length > 0 && (
              <div className="mb-3">
                <select
                  onChange={e => {
                    if (!e.target.value) return
                    append({ exercise_id: e.target.value, sets: 3, reps: 10, rest_seconds: 60, order_index: fields.length })
                    e.target.value = ''
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#0d0d14] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[#22d3ee]/50 focus:outline-none"
                >
                  <option value="">+ Agregar ejercicio existente...</option>
                  {exercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>
            )}

            {fields.length > 0 && (
              <div className="mb-3 space-y-2">
                {fields.map((field, i) => {
                  const ex = exercises.find(e => e.id === field.exercise_id)
                  return (
                    <div key={field.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-[var(--text-secondary)]">
                          {ex?.name ?? 'Ejercicio'}
                        </p>
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="rounded-lg p-1 text-[var(--text-muted)] hover:text-red-400"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { name: `exercises.${i}.sets` as const, label: 'Series' },
                          { name: `exercises.${i}.reps` as const, label: 'Reps' },
                          { name: `exercises.${i}.rest_seconds` as const, label: 'Descanso (s)' },
                        ].map(f => (
                          <div key={f.name}>
                            <label className="mb-1 block text-[0.6rem] text-[var(--text-muted)]">{f.label}</label>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              {...register(f.name, { setValueAs: v => v === '' ? null : parseInt(v, 10) })}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#22d3ee]/50 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Crear ejercicio nuevo */}
            <div className="rounded-xl border border-dashed border-white/10 p-3">
              <p className="mb-2 text-[0.65rem] uppercase tracking-wider text-[var(--text-muted)]">Nuevo ejercicio</p>
              <div className="flex gap-2 mb-2">
                <input
                  value={newExName}
                  onChange={e => setNewExName(e.target.value)}
                  placeholder="Nombre del ejercicio"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#22d3ee]/50 focus:outline-none"
                />
                <select
                  value={newExMuscle}
                  onChange={e => setNewExMuscle(e.target.value)}
                  className="w-32 rounded-xl border border-white/10 bg-[#0d0d14] px-2 py-2 text-xs text-[var(--text-primary)] focus:border-[#22d3ee]/50 focus:outline-none"
                >
                  <option value="">Músculo</option>
                  {MUSCLE_GROUPS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleCreateExercise}
                disabled={!newExName.trim() || isCreatingEx}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs text-[var(--text-muted)] transition-colors hover:border-[#22d3ee]/30 hover:text-[#22d3ee] disabled:opacity-40"
              >
                <Plus size={12} />
                Crear y agregar a la rutina
              </button>
            </div>
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
              className="flex-1 rounded-xl bg-[#22d3ee] py-2.5 text-sm font-medium text-[#0a0a0f] transition-colors hover:bg-[#06b6d4] disabled:opacity-40"
            >
              {isSaving ? 'Guardando...' : 'Crear rutina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
