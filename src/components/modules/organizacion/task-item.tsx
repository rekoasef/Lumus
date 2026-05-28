'use client'

import { motion } from 'framer-motion'
import { Check, Calendar, Clock, Trash2, Pencil, AlertCircle } from 'lucide-react'
import type { Task } from '@/types/tasks.types'
import { staggerItem } from '@/lib/utils/animations'
import { localDateStr } from '@/lib/utils/format-date'

const PRIORITY = {
  alta: {
    border: '#ef4444',
    ring: 'rgba(239,68,68,0.5)',
    badge: 'rgba(239,68,68,0.1)',
    label: 'Alta',
    text: '#f87171',
  },
  media: {
    border: '#7c6dfa',
    ring: 'rgba(124,109,250,0.5)',
    badge: 'rgba(124,109,250,0.1)',
    label: 'Media',
    text: '#a78bfa',
  },
  baja: {
    border: '#22c55e',
    ring: 'rgba(34,197,94,0.5)',
    badge: 'rgba(34,197,94,0.1)',
    label: 'Baja',
    text: '#4ade80',
  },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (d.getTime() === today.getTime()) return 'Hoy'
  if (d.getTime() === tomorrow.getTime()) return 'Mañana'
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

interface TaskItemProps {
  task: Task
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  compact?: boolean
}

export function TaskItem({ task, onToggle, onEdit, onDelete, compact = false }: TaskItemProps) {
  const isCompleted = task.status === 'completada'
  const today = localDateStr()
  const isOverdue =
    task.due_date &&
    task.due_date < today &&
    !isCompleted

  const p = PRIORITY[task.priority]

  return (
    <motion.div
      variants={staggerItem}
      layout
      className="group relative flex items-start gap-3 rounded-xl px-4 py-3.5 transition-all"
      style={{
        background: isCompleted
          ? 'rgba(255,255,255,0.015)'
          : 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.065)',
        borderLeft: `3px solid ${isCompleted ? 'rgba(255,255,255,0.08)' : p.border}`,
        opacity: isCompleted ? 0.55 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className="mt-0.5 flex-shrink-0 flex size-[18px] items-center justify-center rounded-full transition-all"
        style={{
          border: isCompleted ? 'none' : `2px solid ${p.ring}`,
          background: isCompleted ? p.border : 'transparent',
          boxShadow: isCompleted ? 'none' : `0 0 6px ${p.ring}`,
        }}
        aria-label={isCompleted ? 'Marcar pendiente' : 'Completar'}
      >
        {isCompleted && <Check size={10} color="#fff" strokeWidth={3} />}
      </button>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium leading-snug ${
            isCompleted
              ? 'line-through text-[var(--text-muted)]'
              : 'text-[var(--text-primary)]'
          }`}
        >
          {task.title}
        </p>

        {!compact && task.description && (
          <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
            {task.description}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {/* Badge prioridad */}
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: p.text, background: p.badge }}
          >
            {p.label}
          </span>

          {/* Fecha */}
          {task.due_date && (
            <span
              className="flex items-center gap-1 text-[11px]"
              style={{ color: isOverdue ? '#f87171' : 'var(--text-muted)' }}
            >
              {isOverdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
              {formatDate(task.due_date)}
              {isOverdue && ' · Vencida'}
            </span>
          )}

          {/* Hora */}
          {task.start_time && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <Clock size={10} />
              {task.start_time.slice(0, 5)}
              {task.duration_minutes && ` · ${task.duration_minutes < 60 ? task.duration_minutes + 'min' : Math.floor(task.duration_minutes / 60) + 'h' + (task.duration_minutes % 60 ? ' ' + task.duration_minutes % 60 + 'min' : '')}`}
            </span>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-0">
        <button
          onClick={() => onEdit(task)}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
          aria-label="Editar"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
          aria-label="Eliminar"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Acciones visibles en mobile (siempre) */}
      <div className="flex shrink-0 items-center gap-0.5 group-hover:hidden sm:hidden">
        <button
          onClick={() => onEdit(task)}
          className="rounded-lg p-1.5 text-[var(--text-muted)]"
          aria-label="Editar"
        >
          <Pencil size={13} />
        </button>
      </div>
    </motion.div>
  )
}
