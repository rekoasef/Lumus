'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import type { Resolver } from 'react-hook-form'
import { createSessionSchema, type CreateSessionInput } from '@/lib/validations/fit'
import type { WorkoutRoutine } from '@/types/fit.types'

const GOAL_LABELS: Record<string, string> = {
  hipertrofia: 'Hipertrofia',
  fuerza:      'Fuerza',
  definicion:  'Definición',
  cardio:      'Cardio',
}

interface SessionLogFormProps {
  date: string
  routines: WorkoutRoutine[]
  onSave: (data: CreateSessionInput) => Promise<boolean>
  onClose: () => void
}

export function SessionLogForm({ date, routines, onSave, onClose }: SessionLogFormProps) {
  const [isSaving, setIsSaving] = useState(false)

  const { register, handleSubmit, watch, setValue } = useForm<CreateSessionInput>({
    resolver: zodResolver(createSessionSchema) as Resolver<CreateSessionInput>,
    defaultValues: { date, completed: true },
  })

  const selectedRoutineId = watch('routine_id')

  async function onSubmit(data: CreateSessionInput) {
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
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Registrar entrenamiento</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {routines.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Rutina (opcional)</label>
              <select
                value={selectedRoutineId ?? ''}
                onChange={e => setValue('routine_id', e.target.value || null)}
                className="w-full rounded-xl border border-white/10 bg-[#0d0d14] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[#22d3ee]/50 focus:outline-none"
              >
                <option value="">Entrenamiento libre</option>
                {routines.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.goal ? ` · ${GOAL_LABELS[r.goal] ?? r.goal}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Duración (minutos)</label>
            <input
              type="number"
              step="1"
              min="1"
              placeholder="60"
              {...register('duration_min', { setValueAs: v => v === '' ? null : parseInt(v, 10) })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#22d3ee]/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Notas</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="¿Cómo fue el entreno?"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#22d3ee]/50 focus:outline-none"
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
              className="flex-1 rounded-xl bg-[#22d3ee] py-2.5 text-sm font-medium text-[#0a0a0f] transition-colors hover:bg-[#06b6d4] disabled:opacity-40"
            >
              {isSaving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
