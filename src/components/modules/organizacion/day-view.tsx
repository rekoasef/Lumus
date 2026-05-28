'use client'

import { motion } from 'framer-motion'
import { Clock, Plus, CheckCircle2, Circle, Zap, Repeat } from 'lucide-react'
import type { Task } from '@/types/tasks.types'
import { localDateStr } from '@/lib/utils/format-date'

const PRIORITY_COLORS = {
  alta: { border: '#ef4444', text: '#f87171', bg: 'rgba(239,68,68,0.08)' },
  media: { border: '#7c6dfa', text: '#a78bfa', bg: 'rgba(124,109,250,0.08)' },
  baja: { border: '#22c55e', text: '#4ade80', bg: 'rgba(34,197,94,0.08)' },
}

function getTodayStr() {
  return localDateStr()
}

function getTodayLong() {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

function isCurrentBlock(task: Task): boolean {
  if (!task.start_time) return false
  const now = new Date()
  const [h, m] = task.start_time.split(':').map(Number)
  const startMins = h * 60 + m
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const endMins = startMins + (task.duration_minutes ?? 30)
  return nowMins >= startMins && nowMins < endMins
}

import type { RepeatType } from '@/types/tasks.types'

const REPEAT_LABELS: Record<RepeatType, string> = {
  daily: 'Todos los días',
  weekly: 'Semanal',
  weekdays: 'Lun–Vie',
  monthly: 'Mensual',
}

function isRecurringToday(task: Task): boolean {
  if (!task.repeat_type) return false
  const today = new Date()
  const todayStr = localDateStr(today)
  if (task.repeat_end_date && todayStr > task.repeat_end_date) return false

  const dow = today.getDay() // 0=Dom, 1=Lun, ..., 6=Sáb
  const dowMon = dow === 0 ? 6 : dow - 1 // Mon=0..Sun=6

  switch (task.repeat_type) {
    case 'daily': return true
    case 'weekdays': return dow >= 1 && dow <= 5
    case 'weekly': return task.repeat_days?.includes(dowMon) ?? false
    case 'monthly': {
      if (!task.due_date) return false
      const taskDay = new Date(task.due_date + 'T00:00:00').getDate()
      return today.getDate() === taskDay
    }
    default: return false
  }
}

interface DayViewProps {
  tasks: Task[]
  recurringTasks: Task[]
  recurringCompletions: Set<string>
  onCreateTask: (date: string, time?: string) => void
  onEditTask: (task: Task) => void
  onToggleTask: (task: Task) => void
  onToggleRecurring: (taskId: string) => void
}

export function DayView({ tasks, recurringTasks, recurringCompletions, onCreateTask, onEditTask, onToggleTask, onToggleRecurring }: DayViewProps) {
  const today = getTodayStr()

  const todayRecurring = recurringTasks.filter(isRecurringToday)

  const scheduled = tasks
    .filter(t => t.due_date?.startsWith(today) && t.start_time)
    .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))

  const unscheduled = tasks.filter(
    t => (!t.due_date || t.due_date.startsWith(today)) && !t.start_time && t.status !== 'completada'
  )

  const overdue = tasks.filter(
    t => t.due_date && t.due_date < today && t.status !== 'completada'
  )

  const completed = tasks.filter(t => t.status === 'completada')
  const total = tasks.filter(t => t.due_date?.startsWith(today) || !t.due_date).length
  const completedToday = tasks.filter(t => t.status === 'completada' && t.due_date?.startsWith(today)).length
  const progressPct = total > 0 ? Math.round((completedToday / total) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Header del día */}
      <div
        className="rounded-2xl px-5 py-4"
        style={{
          background: 'linear-gradient(135deg, rgba(124,109,250,0.07) 0%, rgba(17,17,24,0.9) 100%)',
          border: '1px solid rgba(124,109,250,0.12)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Plan del día
            </p>
            <h2 className="mt-1 text-lg font-semibold capitalize text-[var(--text-primary)]">
              {getTodayLong()}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums" style={{ color: '#bdb4ff' }}>
              {completedToday}
              <span className="text-base font-normal text-[var(--text-muted)]">/{total}</span>
            </p>
            <p className="text-[0.6rem] uppercase tracking-wider text-[var(--text-muted)]">Completadas</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7c6dfa, #bdb4ff)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
          {progressPct === 100
            ? '¡Todo completado! 🎉'
            : `${progressPct}% del día completado`}
        </p>
      </div>

      {/* Vencidas */}
      {overdue.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-[1px] flex-1"
              style={{ background: 'rgba(239,68,68,0.25)' }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#f87171' }}>
              Vencidas · {overdue.length}
            </span>
            <span
              className="h-[1px] flex-1"
              style={{ background: 'rgba(239,68,68,0.25)' }}
            />
          </div>
          <div className="space-y-2">
            {overdue.map(task => (
              <TaskDayRow
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onToggle={onToggleTask}
                overdue
              />
            ))}
          </div>
        </section>
      )}

      {/* Agenda del día */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-[1px] w-8"
              style={{ background: 'rgba(124,109,250,0.3)' }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Agenda
            </span>
          </div>
          <button
            onClick={() => {
              const now = new Date()
              const mins = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30
              const h = Math.floor(mins / 60).toString().padStart(2, '0')
              const m = (mins % 60).toString().padStart(2, '0')
              onCreateTask(today, `${h}:${m}`)
            }}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
            style={{
              background: 'rgba(124,109,250,0.1)',
              color: '#a78bfa',
              border: '1px solid rgba(124,109,250,0.2)',
            }}
          >
            <Plus size={11} />
            Agregar bloque
          </button>
        </div>

        {scheduled.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-8 text-center"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed rgba(255,255,255,0.07)',
            }}
          >
            <Clock size={22} className="mb-2 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">No hay bloques agendados</p>
            <button
              onClick={() => onCreateTask(today, '09:00')}
              className="mt-3 text-xs font-medium"
              style={{ color: '#a78bfa' }}
            >
              Agendar primer bloque
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {scheduled.map(task => {
              const isCurrent = isCurrentBlock(task)
              const p = PRIORITY_COLORS[task.priority]
              const isCompleted = task.status === 'completada'

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 rounded-xl px-4 py-3 transition-all"
                  style={{
                    background: isCurrent
                      ? 'rgba(124,109,250,0.1)'
                      : isCompleted
                        ? 'rgba(255,255,255,0.015)'
                        : 'rgba(255,255,255,0.03)',
                    border: isCurrent
                      ? '1px solid rgba(124,109,250,0.3)'
                      : '1px solid rgba(255,255,255,0.055)',
                    borderLeft: `3px solid ${isCompleted ? 'rgba(255,255,255,0.1)' : p.border}`,
                    opacity: isCompleted ? 0.5 : 1,
                  }}
                >
                  {/* Hora */}
                  <div className="flex-shrink-0 w-12 text-right">
                    <p
                      className="text-xs font-bold tabular-nums"
                      style={{ color: isCurrent ? '#bdb4ff' : 'var(--text-muted)' }}
                    >
                      {task.start_time?.slice(0, 5)}
                    </p>
                    {task.duration_minutes && (
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {formatDuration(task.duration_minutes)}
                      </p>
                    )}
                  </div>

                  {/* Linea divisor */}
                  <div
                    className="w-px self-stretch flex-shrink-0"
                    style={{ background: isCurrent ? 'rgba(124,109,250,0.4)' : 'rgba(255,255,255,0.08)' }}
                  />

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p
                        className={`flex-1 text-sm font-medium leading-snug ${
                          isCompleted
                            ? 'line-through text-[var(--text-muted)]'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {task.title}
                      </p>
                      {isCurrent && (
                        <span
                          className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ background: 'rgba(124,109,250,0.2)', color: '#bdb4ff' }}
                        >
                          Ahora
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() => onToggleTask(task)}
                      className="rounded-full p-1 transition-colors"
                      style={{ color: isCompleted ? '#4ade80' : 'var(--text-muted)' }}
                      aria-label="Completar"
                    >
                      {isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>

      {/* Sin horario */}
      {unscheduled.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-[1px] flex-1"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Sin horario · {unscheduled.length}
            </span>
            <span
              className="h-[1px] flex-1"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
          </div>
          <div className="space-y-2">
            {unscheduled.map(task => (
              <TaskDayRow
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onToggle={onToggleTask}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recurrentes */}
      {todayRecurring.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-[1px] w-6" style={{ background: 'rgba(124,109,250,0.3)' }} />
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <Repeat size={10} style={{ color: '#a78bfa' }} />
              Recurrentes · {todayRecurring.length}
            </span>
            <span className="h-[1px] flex-1" style={{ background: 'rgba(124,109,250,0.15)' }} />
          </div>
          <div className="space-y-2">
            {todayRecurring.map(task => {
              const isDone = recurringCompletions.has(task.id)
              const p = PRIORITY_COLORS[task.priority]
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                  style={{
                    background: 'rgba(124,109,250,0.05)',
                    border: '1px solid rgba(124,109,250,0.12)',
                    borderLeft: `3px solid ${isDone ? 'rgba(255,255,255,0.08)' : p.border}`,
                    opacity: isDone ? 0.5 : 1,
                  }}
                >
                  <button
                    onClick={() => onToggleRecurring(task.id)}
                    className="flex-shrink-0 flex size-[18px] items-center justify-center rounded-full transition-all"
                    style={{
                      border: isDone ? 'none' : `2px solid ${p.border}`,
                      background: isDone ? p.border : 'transparent',
                    }}
                    aria-label="Completar hoy"
                  >
                    {isDone && <CheckCircle2 size={10} color="#fff" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.start_time && (
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {task.start_time.slice(0, 5)}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-[#a78bfa]">
                        <Repeat size={9} />
                        {REPEAT_LABELS[task.repeat_type!]}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onEditTask(task)}
                    className="flex-shrink-0 rounded p-1 text-[var(--text-muted)] opacity-0 hover:opacity-100 hover:text-[var(--text-primary)] transition-opacity"
                    aria-label="Editar"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </motion.div>
              )
            })}
          </div>
        </section>
      )}

      {/* Completadas */}
      {completed.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-[1px] flex-1"
              style={{ background: 'rgba(34,197,94,0.15)' }}
            />
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4ade80' }}>
              <Zap size={10} />
              Completadas · {completed.length}
            </span>
            <span
              className="h-[1px] flex-1"
              style={{ background: 'rgba(34,197,94,0.15)' }}
            />
          </div>
          <div className="space-y-2 opacity-50">
            {completed.slice(0, 5).map(task => (
              <TaskDayRow
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onToggle={onToggleTask}
              />
            ))}
          </div>
        </section>
      )}

      {/* Estado vacío total */}
      {scheduled.length === 0 && unscheduled.length === 0 && overdue.length === 0 && completed.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-3xl py-16 text-center"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.07)',
          }}
        >
          <div
            className="mb-4 flex size-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(124,109,250,0.1)' }}
          >
            <Zap size={24} style={{ color: '#bdb4ff' }} />
          </div>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Día libre</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">No tenés nada agendado para hoy.</p>
          <button
            onClick={() => onCreateTask(today)}
            className="mt-5 rounded-full px-5 py-2.5 text-sm font-bold"
            style={{ background: 'var(--accent-lumus)', color: '#190f5d' }}
          >
            Crear primera tarea
          </button>
        </div>
      )}
    </div>
  )
}

// ── Fila de tarea compacta para la vista día ──────────────────────────────────

interface TaskDayRowProps {
  task: Task
  onEdit: (t: Task) => void
  onToggle: (t: Task) => void
  overdue?: boolean
}

function TaskDayRow({ task, onEdit, onToggle, overdue }: TaskDayRowProps) {
  const isCompleted = task.status === 'completada'
  const p = PRIORITY_COLORS[task.priority]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: overdue
          ? '1px solid rgba(239,68,68,0.15)'
          : '1px solid rgba(255,255,255,0.055)',
        borderLeft: `3px solid ${isCompleted ? 'rgba(255,255,255,0.08)' : p.border}`,
        opacity: isCompleted ? 0.5 : 1,
      }}
    >
      <button
        onClick={() => onToggle(task)}
        className="flex-shrink-0 flex size-[18px] items-center justify-center rounded-full transition-all"
        style={{
          border: isCompleted ? 'none' : `2px solid ${p.border}`,
          background: isCompleted ? p.border : 'transparent',
        }}
        aria-label="Completar"
      >
        {isCompleted && <CheckCircle2 size={10} color="#fff" />}
      </button>

      <p
        className={`flex-1 min-w-0 truncate text-sm font-medium ${
          isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
        }`}
      >
        {task.title}
      </p>

      <span
        className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ color: p.text, background: p.bg }}
      >
        {task.priority}
      </span>

      <button
        onClick={() => onEdit(task)}
        className="flex-shrink-0 rounded p-1 text-[var(--text-muted)] opacity-0 transition-all hover:text-[var(--text-primary)] group-hover:opacity-100"
        aria-label="Editar"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    </motion.div>
  )
}
