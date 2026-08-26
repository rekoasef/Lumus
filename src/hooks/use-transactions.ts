'use client'

import { useCallback, useState } from 'react'
import type { Transaction, TransactionType, Wallet } from '@/types/finance.types'
import type { CreateTransactionInput, UpdateTransactionInput } from '@/lib/validations/finance'

type WalletBalanceUpdate = Pick<Wallet, 'id' | 'name' | 'type' | 'balance' | 'currency' | 'color' | 'icon' | 'created_at' | 'updated_at'>

interface UseTransactionsCallbacks {
  onWalletBalance?: (wallets: WalletBalanceUpdate[]) => void
  /** Se llama después de cada alta, edición o baja: los totales agregados quedaron viejos. */
  onMutated?: () => void
}

/**
 * Alta, edición y baja de movimientos.
 *
 * El hook no mantiene la lista: los totales salen del agregado
 * (`use-finance-summary`) y las filas del detalle se piden por rango
 * (`use-transaction-rows`). Mantener acá un array de transacciones era lo que
 * ataba la pantalla a un tope fijo de filas.
 */
export function useTransactions(callbacks?: UseTransactionsCallbacks) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onWalletBalance = callbacks?.onWalletBalance
  const onMutated = callbacks?.onMutated

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
      if (body.wallets?.length) onWalletBalance?.(body.wallets)
      else if (body.wallet) onWalletBalance?.([body.wallet])
      onMutated?.()
      return body.transaction
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [onWalletBalance, onMutated])

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
      if (wallets?.length) onWalletBalance?.(wallets)
      onMutated?.()
      return transaction
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [onWalletBalance, onMutated])

  const deleteTransaction = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar la transacción')
      const { wallet } = await res.json() as { wallet?: WalletBalanceUpdate }
      if (wallet) onWalletBalance?.([wallet])
      onMutated?.()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [onWalletBalance, onMutated])

  return {
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  }
}

export type { TransactionType }
