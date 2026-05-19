'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { createBodyRecordSchema, type CreateBodyRecordInput } from '@/lib/validations/fit'

interface BodyRecordFormProps {
  onSave: (data: CreateBodyRecordInput) => Promise<boolean>
  onClose: () => void
}

export function BodyRecordForm({ onSave, onClose }: BodyRecordFormProps) {
  const [isSaving, setIsSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, formState: { errors } } = useForm<CreateBodyRecordInput>({
    resolver: zodResolver(createBodyRecordSchema),
    defaultValues: { date: today },
  })

  async function onSubmit(data: CreateBodyRecordInput) {
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
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Registrar medición</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Fecha</label>
            <input
              type="date"
              {...register('date')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[#22d3ee]/50 focus:outline-none"
            />
            {errors.date && <p className="mt-1 text-[0.7rem] text-red-400">{errors.date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'weight_kg' as const,    label: 'Peso (kg)',        step: '0.1' },
              { name: 'body_fat_pct' as const,  label: 'Grasa corporal (%)', step: '0.1' },
              { name: 'muscle_kg' as const,     label: 'Músculo (kg)',     step: '0.1' },
            ].map(f => (
              <div key={f.name} className={f.name === 'weight_kg' ? 'col-span-2' : ''}>
                <label className="mb-1.5 block text-xs text-[var(--text-muted)]">{f.label}</label>
                <input
                  type="number"
                  step={f.step}
                  min="0"
                  {...register(f.name, { setValueAs: v => v === '' ? null : parseFloat(v) })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#22d3ee]/50 focus:outline-none"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Notas</label>
            <textarea
              {...register('notes')}
              rows={2}
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
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
