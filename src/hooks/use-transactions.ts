'use client'

import { useState, useCallback } from 'react'
import type { Transaction, TransactionFilter, TransactionType } from '@/types/finance.types'
import type { CreateTransactionInput, UpdateTransactionInput } from '@/lib/validations/finance'

interface ClassifyResult {
  category_id: string | null
  confidence: number
  from_cache?: boolean
}

export function useTransactions(initialTransactions: Transaction[]) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [loading, setLoading] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<TransactionFilter>({
    type: 'todas',
    category_id: null,
    wallet_id: null,
    date_from: null,
    date_to: null,
  })

  const filtered = transactions.filter(t => {
    if (filter.type !== 'todas' && t.type !== filter.type) return false
    if (filter.category_id && t.category_id !== filter.category_id) return false
    if (filter.wallet_id && t.wallet_id !== filter.wallet_id) return false
    if (filter.date_from && t.date < filter.date_from) return false
    if (filter.date_to && t.date > filter.date_to) return false
    return true
  })

  const totalGastos = filtered
    .filter(t => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalIngresos = filtered
    .filter(t => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0)

  const classifyDescription = useCallback(async (
    description: string,
    amount: number,
    type: 'gasto' | 'ingreso'
  ): Promise<ClassifyResult> => {
    setClassifying(true)
    try {
      const res = await fetch('/api/ai/classify-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, amount, type }),
      })
      if (!res.ok) return { category_id: null, confidence: 0 }
      return await res.json() as ClassifyResult
    } catch {
      return { category_id: null, confidence: 0 }
    } finally {
      setClassifying(false)
    }
  }, [])

  const createTransaction = useCallback(async (
    input: CreateTransactionInput,
    autoClassified = false
  ): Promise<Transaction | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, auto_classified: autoClassified }),
      })
      if (!res.ok) throw new Error('Error al crear la transacción')
      const { transaction } = await res.json() as { transaction: Transaction }
      setTransactions(prev => [transaction, ...prev])
      return transaction
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTransaction = useCallback(async (
    id: string,
    input: UpdateTransactionInput
  ): Promise<Transaction | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al actualizar la transacción')
      const { transaction } = await res.json() as { transaction: Transaction }
      setTransactions(prev => prev.map(t => t.id === id ? transaction : t))
      return transaction
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteTransaction = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar la transacción')
      setTransactions(prev => prev.filter(t => t.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  function updateFilter(partial: Partial<TransactionFilter>) {
    setFilter(prev => ({ ...prev, ...partial }))
  }

  function resetFilter() {
    setFilter({ type: 'todas', category_id: null, wallet_id: null, date_from: null, date_to: null })
  }

  return {
    transactions: filtered,
    allTransactions: transactions,
    totalGastos,
    totalIngresos,
    loading,
    classifying,
    error,
    filter,
    updateFilter,
    resetFilter,
    classifyDescription,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  }
}

export type { TransactionType }
