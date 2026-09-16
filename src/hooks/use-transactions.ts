'use client'

import { useCallback, useState } from 'react'
import type { Transaction, TransactionType, Wallet } from '@/types/finance.types'
import type { CreateTransactionInput, UpdateTransactionInput } from '@/lib/validations/finance'

type WalletBalanceUpdate = Pick<Wallet, 'id' | 'name' | 'type' | 'balance' | 'currency' | 'color' | 'icon' | 'created_at' | 'updated_at'>

/**
 * El resultado de una baja.
 *
 * Devuelve el motivo y no solo un booleano porque hay una baja que la API
 * rechaza a propósito —el desembolso de un préstamo, que se borra desde
 * Préstamos— y "no se pudo eliminar" no le dice a nadie qué hacer.
 */
export interface DeleteTransactionResult {
  ok: boolean
  error?: string
}

/** El mensaje del servidor si vino uno legible; si no, el genérico. */
async function serverError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null) as { error?: unknown } | null
  return typeof body?.error === 'string' ? body.error : fallback
}

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

  /**
   * Alta de un movimiento.
   *
   * Tira si el servidor rechaza, y no devuelve `null`: la pantalla tiene que
   * poder distinguir un alta que falló de una que anduvo. Cuando devolvía
   * `null`, el cartel decía "Movimiento registrado" igual y el gasto no existía.
   */
  const createTransaction = useCallback(async (input: CreateTransactionInput): Promise<Transaction> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await serverError(res, 'Error al crear el movimiento'))
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
      throw e
    } finally {
      setLoading(false)
    }
  }, [onWalletBalance, onMutated])

  /** Edición de un movimiento. Tira si el servidor rechaza, igual que el alta. */
  const updateTransaction = useCallback(async (id: string, input: UpdateTransactionInput): Promise<Transaction> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await serverError(res, 'Error al actualizar el movimiento'))
      const { transaction, wallets } = await res.json() as { transaction: Transaction; wallets?: WalletBalanceUpdate[] }
      if (wallets?.length) onWalletBalance?.(wallets)
      onMutated?.()
      return transaction
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      throw e
    } finally {
      setLoading(false)
    }
  }, [onWalletBalance, onMutated])

  const deleteTransaction = useCallback(async (id: string): Promise<DeleteTransactionResult> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        // El mensaje de la API en vez de uno genérico: cuando el movimiento es
        // el desembolso de un préstamo, ahí está la única pista de qué hacer.
        const body = await res.json().catch(() => null) as { error?: unknown } | null
        throw new Error(
          typeof body?.error === 'string' ? body.error : 'Error al eliminar la transacción',
        )
      }
      const { wallet } = await res.json() as { wallet?: WalletBalanceUpdate }
      if (wallet) onWalletBalance?.([wallet])
      onMutated?.()
      return { ok: true }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error desconocido'
      setError(message)
      return { ok: false, error: message }
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
