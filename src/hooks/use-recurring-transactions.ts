'use client'

import { useState, useCallback } from 'react'
import type { RecurringTransaction, Wallet } from '@/types/finance.types'
import type { CreateRecurringTransactionInput, UpdateRecurringTransactionInput } from '@/lib/validations/finance'
import type { Transaction } from '@/types/finance.types'

type WalletUpdate = Pick<Wallet, 'id' | 'name' | 'type' | 'balance' | 'currency' | 'color' | 'icon' | 'created_at' | 'updated_at'>

/** El mensaje del servidor si vino uno legible; si no, el genérico. */
async function serverError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null) as { error?: unknown } | null
  return typeof body?.error === 'string' ? body.error : fallback
}

interface UseRecurringCallbacks {
  onTransactionCreated?: (tx: Transaction, wallet?: WalletUpdate) => void
}

export function useRecurringTransactions(
  initial: RecurringTransaction[],
  callbacks?: UseRecurringCallbacks,
) {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /*
   * Todas las mutaciones de acá tiran si el servidor rechaza, y ninguna
   * devuelve un vacío: la pantalla tiene que poder distinguir un alta que
   * falló de una que anduvo. Antes se tragaban el error y el cartel decía
   * "Recurrente creada" igual.
   */

  const create = useCallback(async (input: CreateRecurringTransactionInput): Promise<RecurringTransaction> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/recurring-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await serverError(res, 'Error al crear el gasto fijo'))
      const { recurring: rec } = await res.json() as { recurring: RecurringTransaction }
      setRecurring(prev => [...prev, rec].sort((a, b) => a.next_date.localeCompare(b.next_date)))
      return rec
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      throw e
    }
    finally { setLoading(false) }
  }, [])

  const update = useCallback(async (id: string, input: UpdateRecurringTransactionInput): Promise<RecurringTransaction> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/recurring-transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await serverError(res, 'Error al actualizar el gasto fijo'))
      const { recurring: rec } = await res.json() as { recurring: RecurringTransaction }
      setRecurring(prev => prev.map(r => r.id === id ? rec : r))
      return rec
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      throw e
    }
    finally { setLoading(false) }
  }, [])

  const remove = useCallback(async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/recurring-transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await serverError(res, 'Error al eliminar el gasto fijo'))
      setRecurring(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      throw e
    }
    finally { setLoading(false) }
  }, [])

  const toggleActive = useCallback(async (id: string): Promise<void> => {
    const rec = recurring.find(r => r.id === id)
    if (!rec) return
    await update(id, { active: !rec.active })
  }, [recurring, update])

  const apply = useCallback(async (id: string, date?: string): Promise<Transaction> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/recurring-transactions/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) throw new Error(await serverError(res, 'Error al registrar el gasto fijo'))
      const { transaction, wallet, newNextDate } = await res.json() as {
        transaction: Transaction
        wallet?: WalletUpdate
        newNextDate: string
      }
      // Avanzar next_date en el estado local
      setRecurring(prev => prev.map(r => r.id === id ? { ...r, next_date: newNextDate } : r))
      callbacks?.onTransactionCreated?.(transaction, wallet)
      return transaction
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      throw e
    }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring, callbacks?.onTransactionCreated])

  return { recurring, loading, error, create, update, remove, toggleActive, apply }
}
