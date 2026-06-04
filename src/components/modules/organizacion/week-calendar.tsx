'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task, TaskPriority } from '@/types/tasks.types'
import { localDateStr } from '@/lib/utils/format-date'

const START_HOUR = 7
const END_HOUR = 22
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const PX_PER_MINUTE = 1.6
const COLUMN_HEIGHT = TOTAL_MINUTES * PX_PER_MINUTE

const PRIORITY: Record<TaskPriority, { solid: string }> = {
  alta:  { solid: '#ef4444' },
  media: { solid: '#7c6dfa' },
  baja:  { solid: '#22c55e' },
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date: Date): string {
  return localDateStr(date)
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

interface WeekCalendarProps {
  tasks: Task[]
  onCreateTask: (defaultDate: string, defaultTime: string) => void
  onEditTask: (task: Task) => void
}

export function WeekCalendar({ tasks, onCreateTask, onEditTask }: WeekCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const scrollRef = useRef<HTMLDivElement>(null)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const today = formatDate(new Date())

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  const weekLabel = (() => {
    const end = weekDays[6]
    if (weekStart.getMonth() === end.getMonth()) {
      return `${weekStart.getDate()}–${end.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    }
    return `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${weekStart.getFullYear()}`
  })()

  function prevWeek() {
    setWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  function nextWeek() {
    setWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  function goToToday() {
    setWeekStart(getWeekStart(new Date()))
    // Scroll vertical al bloque de hora actual
    if (scrollRef.current) {
      const now = new Date()
      const nowMins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60
      if (nowMins > 0) {
        scrollRef.current.scrollTop = Math.max(0, nowMins * PX_PER_MINUTE - 80)
      }
    }
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dayDate: Date) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const minutes = Math.round(y / PX_PER_MINUTE / 15) * 15
    const totalMins = START_HOUR * 60 + Math.min(Math.max(minutes, 0), TOTAL_MINUTES - 30)
    onCreateTask(formatDate(dayDate), minutesToTime(totalMins))
  }

  function doesRecurOnDate(task: Task, date: Date): boolean {
    if (!task.repeat_type) return false
    const dateStr = formatDate(date)
    // No empezó todavía
    if (task.due_date && dateStr < task.due_date) return false
    // Ya terminó
    if (task.repeat_end_date && dateStr > task.repeat_end_date) return false

    const dow = date.getDay() // 0=Dom…6=Sáb
    const dowMon = dow === 0 ? 6 : dow - 1 // Lun=0…Dom=6

    switch (task.repeat_type) {
      case 'daily': return true
      case 'weekdays': return dow >= 1 && dow <= 5
      case 'weekly': return task.repeat_days?.includes(dowMon) ?? false
      case 'monthly': {
        if (!task.due_date) return false
        return date.getDate() === new Date(task.due_date + 'T00:00:00').getDate()
      }
      default: return false
    }
  }

  function getTasksForDay(dayDate: Date): Task[] {
    const dateStr = formatDate(dayDate)

    const scheduled = tasks.filter(t =>
      !t.repeat_type &&
      t.due_date?.startsWith(dateStr) &&
      t.start_time != null
    )

    const recurring = tasks.filter(t =>
      t.repeat_type != null &&
      t.start_time != null &&
      doesRecurOnDate(t, dayDate)
    )

    return [...scheduled, ...recurring]
  }

  function getBlockStyle(task: Task): React.CSSProperties {
    const startMins = timeToMinutes(task.start_time!) - START_HOUR * 60
    const top = Math.max(0, startMins) * PX_PER_MINUTE
    const height = Math.max((task.duration_minutes ?? 30) * PX_PER_MINUTE, 24)
    return {
      position: 'absolute',
      top,
      left: 3,
      right: 3,
      height,
      backgroundColor: PRIORITY[task.priority].solid,
      borderRadius: 6,
      overflow: 'hidden',
      cursor: 'pointer',
      zIndex: 1,
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Navegación */}
      <div
        className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="flex size-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="min-w-[180px] text-center text-sm font-medium text-[var(--text-primary)]">
            {weekLabel}
          </span>
          <button
            onClick={nextWeek}
            className="flex size-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{
            background: 'rgba(124,109,250,0.1)',
            border: '1px solid rgba(124,109,250,0.2)',
            color: '#a78bfa',
          }}
        >
          Hoy
        </button>
      </div>

      {/* Cabecera días */}
      <div className="flex overflow-x-auto">
        {/* Offset columna de horas */}
        <div className="flex-shrink-0 w-12 sm:w-14" />

        <div className="flex flex-1 min-w-0" style={{ minWidth: 'max(100%, 560px)' }}>
          {weekDays.map((day, i) => {
            const dateStr = formatDate(day)
            const isToday = dateStr === today
            return (
              <div
                key={dateStr}
                className="flex flex-1 flex-col items-center py-2.5"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: isToday ? '#bdb4ff' : 'var(--text-muted)' }}
                >
                  {DAY_NAMES[i]}
                </p>
                <div
                  className="mt-1 flex size-7 items-center justify-center rounded-full text-sm font-semibold"
                  style={{
                    background: isToday ? '#7c6dfa' : 'transparent',
                    color: isToday ? '#fff' : 'var(--text-secondary)',
                    boxShadow: isToday ? '0 0 12px rgba(124,109,250,0.5)' : 'none',
                  }}
                >
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Grid de horas + columnas */}
      <div
        ref={scrollRef}
        className="flex overflow-auto"
        style={{
          maxHeight: '62vh',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Columna de horas */}
        <div
          className="relative flex-shrink-0 w-12 sm:w-14"
          style={{ height: COLUMN_HEIGHT }}
        >
          {hours.map(h => (
            h > START_HOUR && (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-right"
                style={{
                  top: (h - START_HOUR) * 60 * PX_PER_MINUTE - 7,
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatHour(h)}
              </div>
            )
          ))}
        </div>

        {/* Columnas de días */}
        <div
          className="flex flex-1"
          style={{ minWidth: 'max(100%, 560px)' }}
        >
          {weekDays.map((day) => {
            const dateStr = formatDate(day)
            const isToday = dateStr === today
            const dayTasks = getTasksForDay(day)

            // Línea "ahora"
            const nowTop = (() => {
              if (!isToday) return null
              const now = new Date()
              const nowMins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60
              if (nowMins < 0 || nowMins > TOTAL_MINUTES) return null
              return nowMins * PX_PER_MINUTE
            })()

            return (
              <div
                key={dateStr}
                className="relative flex-1 cursor-pointer"
                style={{
                  height: COLUMN_HEIGHT,
                  borderLeft: '1px solid rgba(255,255,255,0.045)',
                  background: isToday ? 'rgba(124,109,250,0.025)' : 'transparent',
                }}
                onClick={e => handleColumnClick(e, day)}
              >
                {/* Líneas de hora y media hora */}
                {hours.map(h => (
                  <div key={h}>
                    <div
                      className="absolute w-full pointer-events-none"
                      style={{
                        top: (h - START_HOUR) * 60 * PX_PER_MINUTE,
                        borderTop: h === START_HOUR ? 'none' : '1px solid rgba(255,255,255,0.055)',
                      }}
                    />
                    <div
                      className="absolute w-full pointer-events-none"
                      style={{
                        top: (h - START_HOUR) * 60 * PX_PER_MINUTE + 30 * PX_PER_MINUTE,
                        borderTop: '1px solid rgba(255,255,255,0.022)',
                      }}
                    />
                  </div>
                ))}

                {/* Línea actual */}
                {nowTop !== null && (
                  <div
                    className="absolute w-full z-10 pointer-events-none flex items-center"
                    style={{ top: nowTop - 1 }}
                  >
                    <div
                      className="size-2.5 rounded-full flex-shrink-0 -ml-1.5"
                      style={{ background: '#ef4444' }}
                    />
                    <div className="flex-1 h-[2px]" style={{ background: '#ef4444', opacity: 0.85 }} />
                  </div>
                )}

                {/* Bloques de tareas */}
                {dayTasks.map(task => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={getBlockStyle(task)}
                    onClick={e => {
                      e.stopPropagation()
                      onEditTask(task)
                    }}
                    title={task.title}
                  >
                    <div className="px-2 py-1.5 h-full overflow-hidden">
                      <p className="text-[11px] font-semibold leading-tight truncate text-white">
                        {task.title}
                      </p>
                      {(task.duration_minutes ?? 0) >= 45 && (
                        <p className="text-[9px] mt-0.5 text-white/70">
                          {task.start_time?.slice(0, 5)}
                          {task.duration_minutes && ` · ${task.duration_minutes}min`}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
