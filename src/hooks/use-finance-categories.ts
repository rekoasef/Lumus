'use client'

import { useState, useCallback } from 'react'
import type { FinanceCategory, CategoryType } from '@/types/finance.types'
import type { CreateCategoryInput, UpdateCategoryInput } from '@/lib/validations/finance'

export function useFinanceCategories(initialCategories: FinanceCategory[]) {
  const [categories, setCategories] = useState<FinanceCategory[]>(initialCategories)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byType = (type: CategoryType) => categories.filter(c => c.type === type)

  const createCategory = useCallback(async (input: CreateCategoryInput): Promise<FinanceCategory | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al crear la categoría')
      const { category } = await res.json() as { category: FinanceCategory }
      setCategories(prev => [...prev, category])
      return category
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateCategory = useCallback(async (id: string, input: UpdateCategoryInput): Promise<FinanceCategory | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al actualizar la categoría')
      const { category } = await res.json() as { category: FinanceCategory }
      setCategories(prev => prev.map(c => c.id === id ? category : c))
      return category
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const { error: msg } = await res.json() as { error: string }
        throw new Error(msg)
      }
      setCategories(prev => prev.filter(c => c.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    categories,
    byType,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
