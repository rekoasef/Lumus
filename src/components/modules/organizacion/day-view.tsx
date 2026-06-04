'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import type { Task, RepeatType } from '@/types/tasks.types'
import { localDateStr } from '@/lib/utils/format-date'

const PX_PER_MINUTE = 1.0
const HOUR_HEIGHT = 60 * PX_PER_MINUTE
const TOTAL_HOURS = 24
const COLUMN_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

const PRIORITY_COLORS = {
  alta:  { solid: '#ef4444', soft: 'rgba(239,68,68,0.22)' },
  media: { solid: '#7c6dfa', soft: 'rgba(124,109,250,0.22)' },
  baja:  { solid: '#22c55e', soft: 'rgba(34,197,94,0.18)' },
}

function isRecurringToday(task: Task): boolean {
  if (!task.repeat_type) return false
  const today = new Date()
  const todayStr = localDateStr(today)
  if (task.repeat_end_date && todayStr > task.repeat_end_date) return false
  const dow = today.getDay()
  const dowMon = dow === 0 ? 6 : dow - 1
  switch (task.repeat_type) {
    case 'daily': return true
    case 'weekdays': return dow >= 1 && dow <= 5
    case 'weekly': return task.repeat_days?.includes(dowMon) ?? false
    case 'monthly': {
      if (!task.due_date) return false
      return today.getDate() === new Date(task.due_date + 'T00:00:00').getDate()
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

export function DayView({
  tasks,
  recurringTasks,
  recurringCompletions,
  onCreateTask,
  onEditTask,
}: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const today = localDateStr()
  const now = new Date()

  useEffect(() => {
    if (!scrollRef.current) return
    const nowMins = now.getHours() * 60 + now.getMinutes()
    scrollRef.current.scrollTop = Math.max(0, nowMins * PX_PER_MINUTE - 120)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nowTop = (now.getHours() * 60 + now.getMinutes()) * PX_PER_MINUTE

  const timedTasks = [
    ...tasks.filter(t => t.due_date?.startsWith(today) && t.start_time),
    ...recurringTasks.filter(t => t.start_time && isRecurringToday(t)),
  ]

  const allDayTasks = [
    ...tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'completada'),
    ...tasks.filter(t => t.due_date?.startsWith(today) && !t.start_time && t.status !== 'completada'),
    ...recurringTasks.filter(t => !t.start_time && isRecurringToday(t)),
  ]

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const minutes = Math.round(y / PX_PER_MINUTE / 15) * 15
    const clamped = Math.min(Math.max(minutes, 0), TOTAL_HOURS * 60 - 30)
    onCreateTask(today, minutesToTime(clamped))
  }

  const dayLabel = now.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase().replace('.', '')
  const monthLabel = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Day header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: '#a78bfa' }}
          >
            {dayLabel}
          </span>
          <div
            className="flex size-8 items-center justify-center rounded-full text-sm font-bold"
            style={{
              background: '#7c6dfa',
              color: '#fff',
              boxShadow: '0 0 12px rgba(124,109,250,0.45)',
            }}
          >
            {now.getDate()}
          </div>
          <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
            {monthLabel}
          </span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => onCreateTask(today)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
          style={{
            background: 'rgba(124,109,250,0.1)',
            color: '#a78bfa',
            border: '1px solid rgba(124,109,250,0.2)',
          }}
        >
          <Plus size={11} />
          Nueva tarea
        </button>
      </div>

      {/* All-day row */}
      <div
        className="flex items-stretch"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-16 flex-shrink-0 flex items-center justify-end pr-3 py-2"
          style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span
            className="text-[9px] uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Todo el día
          </span>
        </div>
        <div className="flex-1 flex flex-wrap items-center gap-1.5 px-3 py-2 min-h-[40px]">
          {allDayTasks.map(task => {
            const isOverdue = task.due_date && task.due_date < today
            const p = PRIORITY_COLORS[task.priority]
            return (
              <button
                key={task.id}
                onClick={() => onEditTask(task)}
                className="rounded-md px-2.5 py-0.5 text-xs font-medium truncate max-w-[200px] text-white"
                style={{
                  background: isOverdue ? 'rgba(239,68,68,0.25)' : p.soft,
                  borderLeft: `3px solid ${isOverdue ? '#ef4444' : p.solid}`,
                }}
              >
                {task.title}
              </button>
            )
          })}
          <button
            onClick={() => onCreateTask(today)}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition-colors hover:text-white"
            style={{
              color: 'var(--text-muted)',
              border: '1px dashed rgba(255,255,255,0.1)',
            }}
          >
            <Plus size={9} />
            Nueva
          </button>
        </div>
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '72vh' }}>
        <div className="flex" style={{ height: COLUMN_HEIGHT }}>
          {/* Time labels */}
          <div
            className="w-16 flex-shrink-0 relative select-none"
            style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
          >
            {Array.from({ length: TOTAL_HOURS - 1 }, (_, i) => i + 1).map(h => (
              <div
                key={h}
                className="absolute right-3 text-[10px] text-right"
                style={{
                  top: h * HOUR_HEIGHT - 8,
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Event column */}
          <div
            className="flex-1 relative cursor-pointer"
            onClick={handleGridClick}
          >
            {/* Hour and half-hour lines */}
            {Array.from({ length: TOTAL_HOURS }, (_, i) => i).map(h => (
              <div
                key={h}
                className="absolute w-full pointer-events-none"
                style={{ top: h * HOUR_HEIGHT }}
              >
                {h > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }} />
                )}
                <div
                  className="absolute w-full"
                  style={{
                    top: HOUR_HEIGHT / 2,
                    borderTop: '1px solid rgba(255,255,255,0.022)',
                  }}
                />
              </div>
            ))}

            {/* Current time indicator */}
            <div
              className="absolute w-full z-20 pointer-events-none flex items-center"
              style={{ top: nowTop - 1 }}
            >
              <div
                className="size-3 rounded-full flex-shrink-0 -ml-1.5"
                style={{ background: '#ef4444' }}
              />
              <div
                className="flex-1 h-[2px]"
                style={{ background: '#ef4444', opacity: 0.85 }}
              />
            </div>

            {/* Event blocks */}
            {timedTasks.map(task => {
              const p = PRIORITY_COLORS[task.priority]
              const isRecurring = !!task.repeat_type
              const isDone = isRecurring
                ? recurringCompletions.has(task.id)
                : task.status === 'completada'

              const startMins = timeToMinutes(task.start_time!)
              const durationMins = task.duration_minutes ?? 60
              const top = startMins * PX_PER_MINUTE
              const height = Math.max(durationMins * PX_PER_MINUTE, 22)
              const isCompact = height < 42
              const endTime = minutesToTime(startMins + durationMins)

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: isDone ? 0.45 : 1, scale: 1 }}
                  style={{
                    position: 'absolute',
                    top,
                    left: 4,
                    right: 4,
                    height,
                    background: p.solid,
                    borderRadius: 6,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                  onClick={e => {
                    e.stopPropagation()
                    onEditTask(task)
                  }}
                >
                  <div
                    className={`px-2 h-full overflow-hidden ${
                      isCompact ? 'flex items-center gap-1.5' : 'flex flex-col pt-1.5 pb-1'
                    }`}
                  >
                    <p className="text-white text-xs font-semibold leading-tight truncate">
                      {task.title}
                    </p>
                    {!isCompact && (
                      <p className="text-[10px] text-white/70 mt-0.5 leading-tight">
                        {task.start_time?.slice(0, 5)} – {endTime}
                        {isRecurring && <span className="ml-1 opacity-80">↻</span>}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}

            {/* Empty state */}
            {timedTasks.length === 0 && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ top: '30%' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Hacé clic en el grid para agendar una tarea
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
