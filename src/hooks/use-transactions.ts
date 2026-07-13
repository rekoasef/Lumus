'use client'

import { useState, useCallback } from 'react'
import type { Transaction, TransactionType, Wallet } from '@/types/finance.types'
import type { CreateTransactionInput, UpdateTransactionInput } from '@/lib/validations/finance'

type WalletBalanceUpdate = Pick<Wallet, 'id' | 'name' | 'type' | 'balance' | 'currency' | 'color' | 'icon' | 'created_at' | 'updated_at'>

interface UseTransactionsCallbacks {
  onWalletBalance?: (wallets: WalletBalanceUpdate[]) => void
}

export function useTransactions(
  initialTransactions: Transaction[],
  callbacks?: UseTransactionsCallbacks,
) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const body = await res.json() as {
        transaction: Transaction
        extraTransaction?: Transaction
        wallet?: WalletBalanceUpdate
        wallets?: WalletBalanceUpdate[]
      }
      const newTxs = [body.transaction, ...(body.extraTransaction ? [body.extraTransaction] : [])]
      setTransactions(prev => [...newTxs, ...prev])
      if (body.wallets?.length) callbacks?.onWalletBalance?.(body.wallets)
      else if (body.wallet) callbacks?.onWalletBalance?.([body.wallet])
      return body.transaction
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbacks?.onWalletBalance])

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
      const { transaction, wallets } = await res.json() as { transaction: Transaction; wallets?: WalletBalanceUpdate[] }
      setTransactions(prev => prev.map(t => t.id === id ? transaction : t))
      if (wallets?.length) callbacks?.onWalletBalance?.(wallets)
      return transaction
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbacks?.onWalletBalance])

  const deleteTransaction = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar la transacción')
      const { wallet } = await res.json() as { wallet?: WalletBalanceUpdate }
      setTransactions(prev => prev.filter(t => t.id !== id))
      if (wallet) callbacks?.onWalletBalance?.([wallet])
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbacks?.onWalletBalance])

  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions(prev => [tx, ...prev])
  }, [])

  return {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    addTransaction,
  }
}

export type { TransactionType }
