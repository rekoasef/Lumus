'use client'

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { createTaskSchema, type CreateTaskInput } from '@/lib/validations/tasks'
import type { Task } from '@/types/tasks.types'

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' },
]

interface TaskFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateTaskInput) => Promise<Task | null>
  editingTask?: Task | null
  loading?: boolean
  defaultDate?: string
  defaultTime?: string
}

export function TaskForm({ open, onClose, onSubmit, editingTask, loading, defaultDate, defaultTime }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { priority: 'media' },
  })

  const dueDate = useWatch({ control, name: 'due_date' })

  useEffect(() => {
    if (!open) return
    if (editingTask) {
      reset({
        title: editingTask.title,
        description: editingTask.description ?? undefined,
        priority: editingTask.priority,
        due_date: editingTask.due_date
          ? new Date(editingTask.due_date).toISOString().split('T')[0]
          : undefined,
        start_time: editingTask.start_time ?? undefined,
        duration_minutes: editingTask.duration_minutes ?? undefined,
      })
    } else {
      reset({
        priority: 'media',
        due_date: defaultDate ?? undefined,
        start_time: defaultTime ?? undefined,
        duration_minutes: 60,
      })
    }
  }, [editingTask, reset, open, defaultDate, defaultTime])

  async function onFormSubmit(data: CreateTaskInput) {
    const payload: CreateTaskInput = {
      ...data,
      start_time: dueDate ? (data.start_time ?? null) : null,
      duration_minutes: dueDate ? (data.duration_minutes ?? null) : null,
    }
    const result = await onSubmit(payload)
    if (result) onClose()
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-x-3 bottom-0 z-50 mx-auto max-w-md sm:inset-x-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
          >
            <div
              className="lumus-glass rounded-t-3xl rounded-b-none p-5 max-h-[92vh] overflow-y-auto sm:rounded-3xl sm:p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
                  {editingTask ? 'Editar tarea' : 'Nueva tarea'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                {/* Título */}
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                    Título
                  </label>
                  <input
                    {...register('title')}
                    placeholder="¿Qué tenés que hacer?"
                    autoFocus
                    className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg transition-colors focus:outline-none"
                    style={{
                      ...inputStyle,
                      borderColor: errors.title ? 'var(--danger)' : 'var(--border)',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent-lumus)')}
                    onBlur={e => (e.target.style.borderColor = errors.title ? 'var(--danger)' : 'var(--border)')}
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-[var(--danger)]">{errors.title.message}</p>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                    Descripción{' '}
                    <span className="font-normal normal-case">(opcional)</span>
                  </label>
                  <textarea
                    {...register('description')}
                    placeholder="Detalles adicionales..."
                    rows={2}
                    className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg transition-colors focus:outline-none resize-none"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent-lumus)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>

                {/* Prioridad + Fecha */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                      Prioridad
                    </label>
                    <select
                      {...register('priority')}
                      className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg transition-colors focus:outline-none appearance-none"
                      style={inputStyle}
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                      Día
                    </label>
                    <input
                      type="date"
                      {...register('due_date')}
                      className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg transition-colors focus:outline-none"
                      style={{ ...inputStyle, colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                {/* Hora + Duración — solo si tiene fecha */}
                <AnimatePresence>
                  {dueDate && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                            <Clock size={11} />
                            Hora de inicio
                          </label>
                          <input
                            type="time"
                            {...register('start_time', {
                              setValueAs: (v: string) => (v === '' ? null : v),
                            })}
                            className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg transition-colors focus:outline-none"
                            style={{ ...inputStyle, colorScheme: 'dark' }}
                          />
                          {errors.start_time && (
                            <p className="mt-1 text-xs text-[var(--danger)]">{errors.start_time.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                            Duración
                          </label>
                          <select
                            {...register('duration_minutes', {
                              setValueAs: (v: string) => (v === '' ? null : parseInt(v, 10) || null),
                            })}
                            className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg transition-colors focus:outline-none appearance-none"
                            style={inputStyle}
                          >
                            <option value="">Sin duración</option>
                            {DURATION_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Botones */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.035)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent-lumus)', color: '#190f5d' }}
                  >
                    {loading
                      ? 'Guardando...'
                      : editingTask
                        ? 'Guardar cambios'
                        : 'Crear tarea'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
