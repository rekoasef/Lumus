'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckSquare, List, CalendarDays } from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { TaskItem } from './task-item'
import { TaskForm } from './task-form'
import { WeekCalendar } from './week-calendar'
import type { Task, TaskStatus, TaskPriority } from '@/types/tasks.types'
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validations/tasks'
import { staggerContainer } from '@/lib/utils/animations'

type ViewMode = 'lista' | 'semana'

const STATUS_TABS: { value: TaskStatus | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'completada', label: 'Completadas' },
]

const PRIORITY_OPTIONS: { value: TaskPriority | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas las prioridades' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

interface TaskListProps {
  initialTasks: Task[]
}

export function TaskList({ initialTasks }: TaskListProps) {
  const {
    tasks,
    allTasks,
    loading,
    filter,
    updateFilter,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
  } = useTasks(initialTasks)

  const [viewMode, setViewMode] = useState<ViewMode>('lista')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formDefaults, setFormDefaults] = useState<{ date?: string; time?: string }>({})

  const pendingCount = allTasks.filter(t => t.status === 'pendiente').length
  const completedCount = allTasks.filter(t => t.status === 'completada').length

  async function handleSubmit(data: CreateTaskInput): Promise<Task | null> {
    if (editingTask) {
      return updateTask(editingTask.id, data as UpdateTaskInput)
    }
    return createTask(data)
  }

  function handleEdit(task: Task) {
    setEditingTask(task)
    setFormDefaults({})
    setFormOpen(true)
  }

  function handleCloseForm() {
    setFormOpen(false)
    setEditingTask(null)
    setFormDefaults({})
  }

  function handleCalendarCreate(defaultDate: string, defaultTime: string) {
    setEditingTask(null)
    setFormDefaults({ date: defaultDate, time: defaultTime })
    setFormOpen(true)
  }

  const hasActiveFilter = filter.status !== 'todas' || filter.priority !== 'todas'

  return (
    <div>
      {/* Stats */}
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { value: pendingCount, label: 'Pendientes', color: 'var(--warning)' },
          { value: completedCount, label: 'Completadas', color: 'var(--success)' },
          { value: allTasks.length, label: 'Total', color: 'var(--text-primary)' },
        ].map(stat => (
          <div
            key={stat.label}
            className="lumus-glass rounded-2xl p-5"
          >
            <p className="lumus-heading text-3xl font-semibold" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="lumus-label mt-3 text-[0.62rem] text-[var(--text-muted)]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="lumus-glass mb-6 flex flex-wrap items-center gap-3 rounded-2xl p-3">
        {/* Switcher Lista / Semana */}
        <div
          className="flex shrink-0 gap-1 rounded-xl border border-white/[0.06] bg-white/[0.035] p-1"
        >
          {([
            { value: 'lista' as ViewMode, icon: List, label: 'Lista' },
            { value: 'semana' as ViewMode, icon: CalendarDays, label: 'Semana' },
          ]).map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setViewMode(value)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase transition-all"
              style={{
                backgroundColor: viewMode === value ? 'var(--accent-lumus)' : 'transparent',
                color: viewMode === value ? '#190f5d' : 'var(--text-muted)',
                letterSpacing: '0.06em',
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Filtros — solo en vista lista */}
        {viewMode === 'lista' && (
          <>
            <div
              className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.035] p-1"
            >
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => updateFilter({ status: tab.value })}
                  className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold uppercase transition-all"
                  style={{
                    backgroundColor: filter.status === tab.value ? 'var(--accent-lumus)' : 'transparent',
                    color: filter.status === tab.value ? '#190f5d' : 'var(--text-muted)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              value={filter.priority}
              onChange={e => updateFilter({ priority: e.target.value as TaskPriority | 'todas' })}
              className="appearance-none rounded-xl px-4 py-2.5 text-xs font-semibold uppercase transition-colors focus:outline-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--text-secondary)',
                letterSpacing: '0.06em',
              }}
            >
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Nueva tarea */}
        <button
          onClick={() => {
            setEditingTask(null)
            setFormDefaults({})
            setFormOpen(true)
          }}
          className="flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold uppercase transition-colors"
          style={{ backgroundColor: 'var(--accent-lumus)', color: '#190f5d', letterSpacing: '0.08em' }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-lumus)')}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nueva tarea</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        {viewMode === 'lista' ? (
          <motion.div
            key="lista"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {tasks.length === 0 ? (
              <div className="lumus-glass flex flex-col items-center justify-center rounded-3xl py-20 text-center">
                <div
                  className="mb-4 flex size-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: 'var(--accent-muted)' }}
                >
                  <CheckSquare size={26} style={{ color: 'var(--accent-lumus)' }} />
                </div>
                <p className="lumus-heading text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {hasActiveFilter ? 'No hay tareas con ese filtro' : 'Todavía no tenés tareas'}
                </p>
                {!hasActiveFilter && (
                  <>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                      Creá la primera tarea para organizar el día.
                    </p>
                    <button
                      onClick={() => setFormOpen(true)}
                      className="mt-5 rounded-full px-5 py-2.5 text-sm font-bold uppercase"
                      style={{ backgroundColor: 'var(--accent-lumus)', color: '#190f5d', letterSpacing: '0.08em' }}
                    >
                      Crear tarea
                    </button>
                  </>
                )}
              </div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-2"
              >
                <AnimatePresence mode="popLayout">
                  {tasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={toggleComplete}
                      onEdit={handleEdit}
                      onDelete={deleteTask}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="semana"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <WeekCalendar
              tasks={allTasks}
              onCreateTask={handleCalendarCreate}
              onEditTask={handleEdit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <TaskForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        editingTask={editingTask}
        loading={loading}
        defaultDate={formDefaults.date}
        defaultTime={formDefaults.time}
      />
    </div>
  )
}
