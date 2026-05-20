'use client'

import { useState, useCallback } from 'react'
import type { Transaction, TransactionType } from '@/types/finance.types'
import type { CreateTransactionInput, UpdateTransactionInput } from '@/lib/validations/finance'

export function useTransactions(initialTransactions: Transaction[]) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthGastos = transactions
    .filter(t => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0)

  const monthIngresos = transactions
    .filter(t => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0)

  const createTransaction = useCallback(async (input: CreateTransactionInput): Promise<Transaction | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
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

  const updateTransaction = useCallback(async (id: string, input: UpdateTransactionInput): Promise<Transaction | null> => {
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

  return {
    transactions,
    monthGastos,
    monthIngresos,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  }
}

export type { TransactionType }
