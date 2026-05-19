'use client'

import { useState, useCallback } from 'react'
import type { Task, TaskFilter, TaskStatus, TaskPriority } from '@/types/tasks.types'
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validations/tasks'

export function useTasks(initialTasks: Task[]) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<TaskFilter>({ status: 'todas', priority: 'todas' })

  const filteredTasks = tasks.filter(task => {
    if (filter.status !== 'todas' && task.status !== filter.status) return false
    if (filter.priority !== 'todas' && task.priority !== filter.priority) return false
    return true
  })

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

  // Actualiza optimistamente y hace rollback si falla
  const toggleComplete = useCallback(async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completada' ? 'pendiente' : 'completada'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    const result = await updateTask(task.id, { status: newStatus })
    if (!result) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
    }
  }, [updateTask])

  function updateFilter(partial: Partial<{ status: TaskStatus | 'todas'; priority: TaskPriority | 'todas' }>) {
    setFilter(prev => ({ ...prev, ...partial }))
  }

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    loading,
    error,
    filter,
    updateFilter,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
  }
}
