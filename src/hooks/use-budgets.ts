'use client'

import { useState, useCallback } from 'react'
import type { Budget } from '@/types/finance.types'
import type { CreateBudgetInput, UpdateBudgetInput } from '@/lib/validations/finance'

export function useBudgets(initialBudgets: Budget[], initialMonth: number, initialYear: number) {
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets)
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoCopied, setAutoCopied] = useState(false)

  const refresh = useCallback(async (m = month, y = year) => {
    setLoading(true)
    setError(null)
    setAutoCopied(false)
    try {
      const res = await fetch(`/api/finance/budgets?month=${m}&year=${y}`)
      if (!res.ok) throw new Error('Error al cargar presupuestos')
      const data = await res.json() as { budgets: Budget[]; month: number; year: number; auto_copied?: boolean }
      setBudgets(data.budgets)
      setMonth(data.month)
      setYear(data.year)
      if (data.auto_copied) setAutoCopied(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  const createBudget = useCallback(async (input: CreateBudgetInput): Promise<Budget | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Error al crear el presupuesto' }))
        throw new Error(typeof msg === 'string' ? msg : 'Error al crear el presupuesto')
      }
      const { budget } = await res.json() as { budget: Budget }
      // Solo lo agregamos al estado si pertenece al mes/año visible
      if (budget.month === month && budget.year === year) {
        setBudgets(prev => [...prev, budget])
      }
      return budget
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [month, year])

  const updateBudget = useCallback(async (id: string, input: UpdateBudgetInput): Promise<Budget | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/budgets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al actualizar el presupuesto')
      const { budget } = await res.json() as { budget: Budget }
      setBudgets(prev => prev.map(b => b.id === id ? { ...budget, spent: b.spent ?? 0 } : b))
      return budget
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteBudget = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/budgets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar el presupuesto')
      setBudgets(prev => prev.filter(b => b.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    budgets,
    month,
    year,
    loading,
    error,
    autoCopied,
    refresh,
    createBudget,
    updateBudget,
    deleteBudget,
  }
}
