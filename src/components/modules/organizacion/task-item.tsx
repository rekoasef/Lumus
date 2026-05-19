'use client'

import { motion } from 'framer-motion'
import { Check, Trash2, Calendar, MoreHorizontal } from 'lucide-react'
import type { Task } from '@/types/tasks.types'
import { staggerItem } from '@/lib/utils/animations'

const PRIORITY_COLORS = {
  alta: 'var(--danger)',
  media: 'var(--warning)',
  baja: 'var(--success)',
} as const

const PRIORITY_LABELS = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
} as const

interface TaskItemProps {
  task: Task
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

export function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const isOverdue =
    task.due_date &&
    task.status !== 'completada' &&
    new Date(task.due_date) < new Date()
  const isCompleted = task.status === 'completada'

  return (
    <motion.div
      variants={staggerItem}
      layout
      className={`group flex items-start gap-4 rounded-2xl border px-5 py-4 transition-all backdrop-blur-2xl ${
        isCompleted
          ? 'border-white/[0.045] bg-white/[0.025] opacity-60'
          : 'border-white/[0.07] bg-white/[0.035] hover:border-[var(--accent-lumus)]/35 hover:bg-white/[0.055]'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-all"
        style={{
          borderColor: isCompleted ? 'var(--accent-lumus)' : 'var(--border)',
          backgroundColor: isCompleted ? 'var(--accent-lumus)' : 'transparent',
        }}
        aria-label={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
      >
        {isCompleted && <Check size={12} color="#fff" strokeWidth={3} />}
      </button>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p
          className={`truncate text-sm font-semibold ${
            isCompleted
              ? 'line-through text-[var(--text-muted)]'
              : 'text-[var(--text-primary)]'
          }`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="rounded px-2 py-1 text-[10px] font-bold uppercase"
              style={{
                color: PRIORITY_COLORS[task.priority],
                backgroundColor: `${PRIORITY_COLORS[task.priority]}18`,
                letterSpacing: '0.06em',
              }}
            >
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.due_date && (
            <span
              className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'
              }`}
            >
              <Calendar size={11} />
              {new Date(task.due_date).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
              })}
              {isOverdue && ' · Vencida'}
            </span>
          )}
        </div>
      </div>

      {/* Acciones — visibles en hover */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Editar tarea"
        >
          <MoreHorizontal size={15} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg hover:bg-[var(--danger-muted)] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
          aria-label="Eliminar tarea"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}
