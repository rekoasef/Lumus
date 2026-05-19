'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Task, TaskPriority } from '@/types/tasks.types'

// Rango visible: 06:00 a 22:00 (16 horas = 960 minutos)
const START_HOUR = 6
const END_HOUR = 22
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const PX_PER_MINUTE = 1.5
const COLUMN_HEIGHT = TOTAL_MINUTES * PX_PER_MINUTE

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; border: string; text: string }> = {
  alta:  { bg: 'rgba(239,68,68,0.15)',  border: 'rgb(239,68,68)',  text: 'rgb(239,68,68)' },
  media: { bg: 'rgba(124,109,250,0.15)', border: 'var(--accent-lumus)', text: 'var(--accent-lumus)' },
  baja:  { bg: 'rgba(34,197,94,0.12)',  border: 'rgb(34,197,94)',  text: 'rgb(34,197,94)' },
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // Lunes como primer día de la semana
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
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

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

interface WeekCalendarProps {
  tasks: Task[]
  onCreateTask: (defaultDate: string, defaultTime: string) => void
  onEditTask: (task: Task) => void
}

export function WeekCalendar({ tasks, onCreateTask, onEditTask }: WeekCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const today = formatDate(new Date())

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
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dayDate: Date) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const minutes = Math.round(y / PX_PER_MINUTE / 15) * 15
    const totalMins = START_HOUR * 60 + Math.min(Math.max(minutes, 0), TOTAL_MINUTES - 30)
    onCreateTask(formatDate(dayDate), minutesToTime(totalMins))
  }

  // Agrupa tareas por día (con start_time asignado)
  function getTasksForDay(dayDate: Date): Task[] {
    const dateStr = formatDate(dayDate)
    return tasks.filter(t =>
      t.due_date &&
      t.due_date.startsWith(dateStr) &&
      t.start_time !== null &&
      t.start_time !== undefined
    )
  }

  // Posición y altura del bloque
  function getBlockStyle(task: Task): React.CSSProperties {
    const startMins = timeToMinutes(task.start_time!) - START_HOUR * 60
    const top = Math.max(0, startMins) * PX_PER_MINUTE
    const height = Math.max((task.duration_minutes ?? 30) * PX_PER_MINUTE, 24)
    const colors = PRIORITY_COLORS[task.priority]
    return {
      position: 'absolute',
      top,
      left: 2,
      right: 2,
      height,
      backgroundColor: colors.bg,
      borderLeft: `2px solid ${colors.border}`,
      borderRadius: 6,
      overflow: 'hidden',
      cursor: 'pointer',
      zIndex: 1,
    }
  }

  const weekLabel = (() => {
    const end = weekDays[6]
    const s = weekStart
    if (s.getMonth() === end.getMonth()) {
      return `${s.getDate()}–${end.getDate()} de ${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`
    }
    return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`
  })()

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  return (
    <div className="flex flex-col h-full">
      {/* Navegación */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-[var(--text-primary)] min-w-[200px] text-center">
            {weekLabel}
          </span>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1 text-xs font-medium rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          Hoy
        </button>
      </div>

      {/* Grid */}
      <div className="flex overflow-auto flex-1 min-h-0" style={{ maxHeight: '65vh' }}>
        {/* Columna de horas */}
        <div className="flex-shrink-0 w-12 relative" style={{ height: COLUMN_HEIGHT }}>
          {hours.map(h => (
            <div
              key={h}
              className="absolute text-[10px] text-right pr-2"
              style={{
                top: (h - START_HOUR) * 60 * PX_PER_MINUTE - 6,
                right: 0,
                color: 'var(--text-muted)',
                width: '100%',
              }}
            >
              {h}:00
            </div>
          ))}
        </div>

        {/* Columnas de días */}
        <div className="flex flex-1 gap-1 min-w-0">
          {weekDays.map((day, i) => {
            const dateStr = formatDate(day)
            const isToday = dateStr === today
            const dayTasks = getTasksForDay(day)

            return (
              <div key={dateStr} className="flex flex-col flex-1 min-w-0">
                {/* Header del día */}
                <div className="flex-shrink-0 text-center mb-1 pb-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {DAY_NAMES[i]}
                  </p>
                  <p
                    className="text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mx-auto"
                    style={{
                      backgroundColor: isToday ? 'var(--accent-lumus)' : 'transparent',
                      color: isToday ? '#fff' : 'var(--text-primary)',
                    }}
                  >
                    {day.getDate()}
                  </p>
                </div>

                {/* Columna con slots */}
                <div
                  className="relative flex-1 cursor-pointer group"
                  style={{ height: COLUMN_HEIGHT, flexShrink: 0 }}
                  onClick={e => handleColumnClick(e, day)}
                >
                  {/* Líneas de hora */}
                  {hours.map(h => (
                    <div
                      key={h}
                      className="absolute w-full"
                      style={{
                        top: (h - START_HOUR) * 60 * PX_PER_MINUTE,
                        borderTop: `1px solid var(--border-subtle)`,
                        opacity: 0.5,
                      }}
                    />
                  ))}

                  {/* Línea actual */}
                  {isToday && (() => {
                    const now = new Date()
                    const nowMins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60
                    if (nowMins < 0 || nowMins > TOTAL_MINUTES) return null
                    return (
                      <div
                        className="absolute w-full z-10 pointer-events-none"
                        style={{ top: nowMins * PX_PER_MINUTE }}
                      >
                        <div className="w-2 h-2 rounded-full -ml-1 absolute" style={{ backgroundColor: 'var(--accent-lumus)', top: -4 }} />
                        <div className="w-full h-px" style={{ backgroundColor: 'var(--accent-lumus)' }} />
                      </div>
                    )
                  })()}

                  {/* Hint de click */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-center pt-2 pointer-events-none"
                    style={{ zIndex: 0 }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--accent-muted)' }}
                    >
                      <Plus size={10} style={{ color: 'var(--accent-lumus)' }} />
                    </div>
                  </div>

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
                    >
                      <div className="px-1.5 py-1 h-full overflow-hidden">
                        <p
                          className="text-[10px] font-medium leading-tight truncate"
                          style={{ color: PRIORITY_COLORS[task.priority].text }}
                        >
                          {task.title}
                        </p>
                        {task.duration_minutes && task.duration_minutes >= 30 && (
                          <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {task.start_time} · {task.duration_minutes}min
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
