'use client'

import { useState, useCallback } from 'react'
import type { RecurringTransaction, Wallet } from '@/types/finance.types'
import type { CreateRecurringTransactionInput, UpdateRecurringTransactionInput } from '@/lib/validations/finance'
import type { Transaction } from '@/types/finance.types'

type WalletUpdate = Pick<Wallet, 'id' | 'name' | 'type' | 'balance' | 'currency' | 'color' | 'icon' | 'created_at' | 'updated_at'>

interface UseRecurringCallbacks {
  onTransactionCreated?: (tx: Transaction, wallet?: WalletUpdate) => void
}

export function useRecurringTransactions(
  initial: RecurringTransaction[],
  callbacks?: UseRecurringCallbacks,
) {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>(initial)
  const [loading, setLoading] = useState(false)

  const create = useCallback(async (input: CreateRecurringTransactionInput): Promise<RecurringTransaction | null> => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/recurring-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al crear')
      const { recurring: rec } = await res.json() as { recurring: RecurringTransaction }
      setRecurring(prev => [...prev, rec].sort((a, b) => a.next_date.localeCompare(b.next_date)))
      return rec
    } catch { return null }
    finally { setLoading(false) }
  }, [])

  const update = useCallback(async (id: string, input: UpdateRecurringTransactionInput): Promise<RecurringTransaction | null> => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/recurring-transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      const { recurring: rec } = await res.json() as { recurring: RecurringTransaction }
      setRecurring(prev => prev.map(r => r.id === id ? rec : r))
      return rec
    } catch { return null }
    finally { setLoading(false) }
  }, [])

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/recurring-transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setRecurring(prev => prev.filter(r => r.id !== id))
      return true
    } catch { return false }
    finally { setLoading(false) }
  }, [])

  const toggleActive = useCallback(async (id: string): Promise<void> => {
    const rec = recurring.find(r => r.id === id)
    if (!rec) return
    await update(id, { active: !rec.active })
  }, [recurring, update])

  const apply = useCallback(async (id: string, date?: string): Promise<Transaction | null> => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/recurring-transactions/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) throw new Error('Error al aplicar')
      const { transaction, wallet, newNextDate } = await res.json() as {
        transaction: Transaction
        wallet?: WalletUpdate
        newNextDate: string
      }
      // Avanzar next_date en el estado local
      setRecurring(prev => prev.map(r => r.id === id ? { ...r, next_date: newNextDate } : r))
      callbacks?.onTransactionCreated?.(transaction, wallet)
      return transaction
    } catch { return null }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring, callbacks?.onTransactionCreated])

  return { recurring, loading, create, update, remove, toggleActive, apply }
}
