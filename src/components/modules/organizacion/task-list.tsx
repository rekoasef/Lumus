'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CalendarDays, List, Sun, ChevronDown, ChevronUp } from 'lucide-react'
import { localDateStr } from '@/lib/utils/format-date'
import { useTasks } from '@/hooks/use-tasks'
import { TaskItem } from './task-item'
import { TaskForm } from './task-form'
import { WeekCalendar } from './week-calendar'
import { DayView } from './day-view'
import type { Task, TaskStatus, TaskPriority } from '@/types/tasks.types'
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validations/tasks'

type ViewMode = 'hoy' | 'lista' | 'semana'

const VIEWS: { value: ViewMode; icon: React.ElementType; label: string }[] = [
  { value: 'hoy', icon: Sun, label: 'Hoy' },
  { value: 'lista', icon: List, label: 'Lista' },
  { value: 'semana', icon: CalendarDays, label: 'Semana' },
]

// Grupos para la vista lista
interface TaskGroup {
  id: string
  label: string
  accent: string
  tasks: Task[]
  collapsible?: boolean
}

function buildGroups(tasks: Task[]): TaskGroup[] {
  const todayStr = localDateStr()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = localDateStr(tomorrow)

  const endOfWeek = new Date()
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))
  const endOfWeekStr = localDateStr(endOfWeek)

  const pending = tasks.filter(t => t.status !== 'completada')
  const done = tasks.filter(t => t.status === 'completada')

  const overdue = pending.filter(t => t.due_date && t.due_date < todayStr)
  const todayTasks = pending.filter(t => t.due_date?.startsWith(todayStr))
  const tomorrowTasks = pending.filter(t => t.due_date?.startsWith(tomorrowStr))
  const thisWeek = pending.filter(t =>
    t.due_date &&
    t.due_date > tomorrowStr &&
    t.due_date <= endOfWeekStr
  )
  const upcoming = pending.filter(t => t.due_date && t.due_date > endOfWeekStr)
  const noDate = pending.filter(t => !t.due_date)

  const groups: TaskGroup[] = []

  if (overdue.length)    groups.push({ id: 'overdue',   label: 'Vencidas',       accent: '#f87171', tasks: overdue })
  if (todayTasks.length) groups.push({ id: 'today',     label: 'Hoy',            accent: '#bdb4ff', tasks: todayTasks })
  if (tomorrowTasks.length) groups.push({ id: 'tomorrow', label: 'Mañana',       accent: '#a78bfa', tasks: tomorrowTasks })
  if (thisWeek.length)   groups.push({ id: 'week',      label: 'Esta semana',    accent: 'var(--text-secondary)', tasks: thisWeek })
  if (upcoming.length)   groups.push({ id: 'upcoming',  label: 'Próximamente',   accent: 'var(--text-muted)', tasks: upcoming })
  if (noDate.length)     groups.push({ id: 'nodate',    label: 'Sin fecha',      accent: 'var(--text-muted)', tasks: noDate })
  if (done.length)       groups.push({ id: 'done',      label: 'Completadas',    accent: '#4ade80', tasks: done, collapsible: true })

  return groups
}

interface TaskListProps {
  initialTasks: Task[]
  initialCompletions: Set<string>
}

export function TaskList({ initialTasks, initialCompletions }: TaskListProps) {
  const { tasks, allTasks, recurringTasks, recurringCompletions, loading, createTask, updateTask, deleteTask, toggleComplete, toggleRecurringComplete } =
    useTasks(initialTasks, initialCompletions)

  const [viewMode, setViewMode] = useState<ViewMode>('hoy')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formDefaults, setFormDefaults] = useState<{ date?: string; time?: string }>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['done']))

  const pendingCount = allTasks.filter(t => t.status === 'pendiente').length
  const completedCount = allTasks.filter(t => t.status === 'completada').length

  async function handleSubmit(data: CreateTaskInput): Promise<Task | null> {
    if (editingTask) return updateTask(editingTask.id, data as UpdateTaskInput)
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

  function openNewTask(date?: string, time?: string) {
    setEditingTask(null)
    setFormDefaults({ date, time })
    setFormOpen(true)
  }

  function toggleGroup(id: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const todayStr = localDateStr()

  return (
    <div>
      {/* Stats compactas */}
      <div className="mb-5 grid grid-cols-3 gap-3 sm:mb-6">
        {[
          { value: pendingCount, label: 'Pendientes', color: '#ffb86e' },
          { value: completedCount, label: 'Completadas', color: '#4ade80' },
          { value: allTasks.length, label: 'Total', color: '#bdb4ff' },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-2xl px-4 py-4 text-center"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p className="text-2xl font-bold tabular-nums" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex items-center gap-3 sm:mb-6">
        {/* Vista switcher */}
        <div
          className="flex gap-1 rounded-xl p-1"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {VIEWS.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setViewMode(value)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
              style={{
                background: viewMode === value ? '#7c6dfa' : 'transparent',
                color: viewMode === value ? '#fff' : 'var(--text-muted)',
                boxShadow: viewMode === value ? '0 2px 12px rgba(124,109,250,0.4)' : 'none',
              }}
            >
              <Icon size={12} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Nueva tarea */}
        <button
          onClick={() => openNewTask(viewMode === 'hoy' ? todayStr : undefined)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
          style={{
            background: '#7c6dfa',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(124,109,250,0.35)',
          }}
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nueva tarea</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        {viewMode === 'hoy' && (
          <motion.div
            key="hoy"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <DayView
              tasks={allTasks}
              recurringTasks={recurringTasks}
              recurringCompletions={recurringCompletions}
              onCreateTask={openNewTask}
              onEditTask={handleEdit}
              onToggleTask={toggleComplete}
              onToggleRecurring={toggleRecurringComplete}
            />
          </motion.div>
        )}

        {viewMode === 'lista' && (
          <motion.div
            key="lista"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {allTasks.length === 0 ? (
              <EmptyState onAdd={() => openNewTask()} />
            ) : (
              <div className="space-y-6">
                {buildGroups(tasks).map(group => (
                  <GroupSection
                    key={group.id}
                    group={group}
                    collapsed={collapsedGroups.has(group.id)}
                    onToggleCollapse={() => toggleGroup(group.id)}
                    onEdit={handleEdit}
                    onToggle={toggleComplete}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {viewMode === 'semana' && (
          <motion.div
            key="semana"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <WeekCalendar
              tasks={allTasks}
              onCreateTask={openNewTask}
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

// ── Grupo de tareas en vista lista ────────────────────────────────────────────

interface GroupSectionProps {
  group: TaskGroup
  collapsed: boolean
  onToggleCollapse: () => void
  onEdit: (t: Task) => void
  onToggle: (t: Task) => void
  onDelete: (id: string) => void
}

function GroupSection({ group, collapsed, onToggleCollapse, onEdit, onToggle, onDelete }: GroupSectionProps) {
  return (
    <div>
      {/* Cabecera del grupo */}
      <button
        className="mb-2.5 flex w-full items-center gap-2"
        onClick={group.collapsible ? onToggleCollapse : undefined}
        style={{ cursor: group.collapsible ? 'pointer' : 'default' }}
      >
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: group.accent }}>
          {group.label}
        </span>
        <span
          className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: 'rgba(255,255,255,0.06)', color: group.accent }}
        >
          {group.tasks.length}
        </span>
        <span className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        {group.collapsible && (
          <span className="text-[var(--text-muted)]">
            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </span>
        )}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-2">
              {group.tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Estado vacío ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-3xl py-20 text-center"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed rgba(255,255,255,0.07)',
      }}
    >
      <div
        className="mb-4 flex size-14 items-center justify-center rounded-2xl"
        style={{ background: 'rgba(124,109,250,0.1)' }}
      >
        <List size={26} style={{ color: '#bdb4ff' }} />
      </div>
      <p className="text-sm font-semibold text-[var(--text-secondary)]">
        No tenés tareas todavía
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Creá la primera para organizar tu día.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 rounded-full px-5 py-2.5 text-sm font-semibold"
        style={{ background: '#7c6dfa', color: '#fff' }}
      >
        Crear tarea
      </button>
    </div>
  )
}
