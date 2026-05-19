'use client'

import { useState, useCallback } from 'react'
import type { SavingGoal } from '@/types/finance.types'
import type { CreateSavingGoalInput, UpdateSavingGoalInput } from '@/lib/validations/finance'

export function useSavingGoals(initialGoals: SavingGoal[]) {
  const [goals, setGoals] = useState<SavingGoal[]>(initialGoals)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/saving-goals')
      if (!res.ok) throw new Error('Error al cargar metas')
      const data = await res.json() as { goals: SavingGoal[] }
      setGoals(data.goals)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const createGoal = useCallback(async (input: CreateSavingGoalInput): Promise<SavingGoal | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/saving-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Error al crear la meta' }))
        throw new Error(typeof msg === 'string' ? msg : 'Error al crear la meta')
      }
      const { goal } = await res.json() as { goal: SavingGoal }
      setGoals(prev => [...prev, goal])
      return goal
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateGoal = useCallback(async (id: string, input: UpdateSavingGoalInput): Promise<SavingGoal | null> => {
    setError(null)
    try {
      const res = await fetch(`/api/finance/saving-goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al actualizar la meta')
      const { goal } = await res.json() as { goal: SavingGoal }
      setGoals(prev => prev.map(g => g.id === id ? goal : g))
      return goal
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    }
  }, [])

  const deleteGoal = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/saving-goals/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar la meta')
      setGoals(prev => prev.filter(g => g.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const contribute = useCallback(async (id: string, amount: number): Promise<boolean> => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return false
    const updated = await updateGoal(id, { current_amount: goal.current_amount + amount })
    return updated !== null
  }, [goals, updateGoal])

  const markAchieved = useCallback(async (id: string): Promise<boolean> => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return false
    const updated = await updateGoal(id, { achieved: true, current_amount: goal.target_amount })
    return updated !== null
  }, [goals, updateGoal])

  return {
    goals,
    loading,
    error,
    refresh,
    createGoal,
    updateGoal,
    deleteGoal,
    contribute,
    markAchieved,
  }
}
