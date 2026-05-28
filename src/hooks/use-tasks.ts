'use client'

import { useState, useCallback } from 'react'
import type { Task, TaskFilter, TaskStatus, TaskPriority } from '@/types/tasks.types'
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validations/tasks'

export function useTasks(initialTasks: Task[], initialRecurringCompletions: Set<string> = new Set()) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<TaskFilter>({ status: 'todas', priority: 'todas' })
  const [recurringCompletions, setRecurringCompletions] = useState<Set<string>>(initialRecurringCompletions)

  const filteredTasks = tasks.filter(task => {
    if (task.repeat_type) return false // tareas recurrentes van por aparte en day view
    if (filter.status !== 'todas' && task.status !== filter.status) return false
    if (filter.priority !== 'todas' && task.priority !== filter.priority) return false
    return true
  })

  const recurringTasks = tasks.filter(t => t.repeat_type != null)

  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al crear la tarea')
      const { task } = await res.json() as { task: Task }
      setTasks(prev => [task, ...prev])
      return task
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTask = useCallback(async (id: string, input: UpdateTaskInput): Promise<Task | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al actualizar la tarea')
      const { task } = await res.json() as { task: Task }
      setTasks(prev => prev.map(t => t.id === id ? task : t))
      return task
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar la tarea')
      setTasks(prev => prev.filter(t => t.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleComplete = useCallback(async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completada' ? 'pendiente' : 'completada'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    const result = await updateTask(task.id, { status: newStatus })
    if (!result) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
    }
  }, [updateTask])

  const toggleRecurringComplete = useCallback(async (taskId: string) => {
    const today = new Date().toISOString().slice(0, 10)
    const isCompleted = recurringCompletions.has(taskId)

    // Optimistic update
    setRecurringCompletions(prev => {
      const next = new Set(prev)
      if (isCompleted) next.delete(taskId)
      else next.add(taskId)
      return next
    })

    const method = isCompleted ? 'DELETE' : 'POST'
    const url = isCompleted
      ? `/api/tasks/${taskId}/completions?date=${today}`
      : `/api/tasks/${taskId}/completions`

    const res = await fetch(url, {
      method,
      ...(isCompleted ? {} : {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      }),
    })

    if (!res.ok) {
      // Rollback
      setRecurringCompletions(prev => {
        const next = new Set(prev)
        if (isCompleted) next.add(taskId)
        else next.delete(taskId)
        return next
      })
    }
  }, [recurringCompletions])

  function updateFilter(partial: Partial<{ status: TaskStatus | 'todas'; priority: TaskPriority | 'todas' }>) {
    setFilter(prev => ({ ...prev, ...partial }))
  }

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    recurringTasks,
    recurringCompletions,
    loading,
    error,
    filter,
    updateFilter,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    toggleRecurringComplete,
  }
}
