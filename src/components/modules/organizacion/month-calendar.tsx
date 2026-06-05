'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Task, TaskPriority } from '@/types/tasks.types'
import { localDateStr } from '@/lib/utils/format-date'

const DAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  alta:  '#ef4444',
  media: '#7c6dfa',
  baja:  '#22c55e',
}

interface MonthCalendarProps {
  tasks: Task[]
  onCreateTask: (date: string) => void
  onEditTask: (task: Task) => void
}

interface CalendarDay {
  date: Date
  dateStr: string
  isCurrentMonth: boolean
  tasks: Task[]
}

function buildCalendarDays(year: number, month: number, tasks: Task[]): CalendarDay[] {
  // Tasks indexed by date string
  const tasksByDate = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!t.due_date) continue
    const key = t.due_date.slice(0, 10)
    if (!tasksByDate.has(key)) tasksByDate.set(key, [])
    tasksByDate.get(key)!.push(t)
  }

  const firstDay = new Date(year, month, 1)
  // Monday=0 … Sunday=6
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7

  const days: CalendarDay[] = []
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(year, month, 1 - startOffset + i)
    const dateStr = localDateStr(date)
    days.push({
      date,
      dateStr,
      isCurrentMonth: date.getMonth() === month,
      tasks: tasksByDate.get(dateStr) ?? [],
    })
  }
  return days
}

export function MonthCalendar({ tasks, onCreateTask, onEditTask }: MonthCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const todayStr = localDateStr(today)

  const days = useMemo(() => buildCalendarDays(year, month, tasks), [year, month, tasks])
  const weeks = useMemo(() => {
    const w: CalendarDay[][] = []
    for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7))
    return w
  }, [days])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-lg border border-white/10 p-1.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="lumus-heading min-w-[140px] text-center text-sm font-semibold text-[var(--text-primary)] sm:text-base">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="rounded-lg border border-white/10 p-1.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {!isCurrentMonth && (
          <button
            onClick={goToday}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
          >
            Hoy
          </button>
        )}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {DAY_HEADERS.map(d => (
          <div key={d} className="py-2 text-center text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className={`grid grid-cols-7 ${wi < weeks.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
            {week.map((day) => {
              const isToday = day.dateStr === todayStr
              const hasTasks = day.tasks.length > 0
              const visibleTasks = day.tasks.slice(0, 3)
              const overflow = day.tasks.length - 3

              return (
                <button
                  key={day.dateStr}
                  onClick={() => onCreateTask(day.dateStr)}
                  className={`group relative flex min-h-[72px] flex-col gap-1 p-1.5 text-left transition-colors sm:min-h-[90px] sm:p-2 ${
                    day.isCurrentMonth
                      ? 'hover:bg-white/[0.03]'
                      : 'opacity-35'
                  } ${wi > 0 ? 'border-t border-white/[0.04]' : ''}`}
                  style={{
                    borderLeft: wi === 0 || day === week[0] ? undefined : '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Day number */}
                  <span
                    className={`flex h-6 w-6 items-center justify-center self-end rounded-full text-[0.65rem] font-semibold transition-colors sm:h-7 sm:w-7 sm:text-xs ${
                      isToday
                        ? 'bg-[#7c6dfa] text-white shadow-[0_0_12px_rgba(124,109,250,0.5)]'
                        : hasTasks
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {day.date.getDate()}
                  </span>

                  {/* Task chips */}
                  <div className="flex flex-col gap-0.5 w-full">
                    {visibleTasks.map(t => (
                      <button
                        key={t.id}
                        onClick={e => { e.stopPropagation(); onEditTask(t) }}
                        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[0.55rem] font-medium leading-tight transition-colors hover:opacity-80 sm:text-[0.6rem]"
                        style={{
                          background: `${PRIORITY_COLOR[t.priority]}18`,
                          color: t.status === 'completada' ? 'var(--text-muted)' : PRIORITY_COLOR[t.priority],
                          textDecoration: t.status === 'completada' ? 'line-through' : 'none',
                        }}
                      >
                        <span
                          className="h-1 w-1 shrink-0 rounded-full"
                          style={{ background: PRIORITY_COLOR[t.priority] }}
                        />
                        <span className="truncate">{t.title}</span>
                      </button>
                    ))}

                    {overflow > 0 && (
                      <span className="px-1 text-[0.55rem] text-[var(--text-muted)] sm:text-[0.6rem]">
                        +{overflow} más
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer — resumen del mes */}
      <div className="border-t border-white/[0.06] px-4 py-2.5 flex items-center gap-4">
        {(['alta', 'media', 'baja'] as TaskPriority[]).map(p => {
          const count = tasks.filter(t => t.priority === p && t.due_date?.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length
          if (!count) return null
          return (
            <span key={p} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_COLOR[p] }} />
              {count} {p}
            </span>
          )
        })}
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {tasks.filter(t => t.due_date?.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`) && t.status === 'completada').length}
          {' / '}
          {tasks.filter(t => t.due_date?.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length} completadas
        </span>
      </div>
    </motion.div>
  )
}
