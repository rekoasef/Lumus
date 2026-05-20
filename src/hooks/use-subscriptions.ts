'use client'

import { useState, useCallback } from 'react'
import type { Subscription } from '@/types/finance.types'
import type { CreateSubscriptionInput, UpdateSubscriptionInput } from '@/lib/validations/finance'

export function useSubscriptions(initialSubscriptions: Subscription[]) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/subscriptions')
      if (!res.ok) throw new Error('Error al cargar suscripciones')
      const data = await res.json() as { subscriptions: Subscription[] }
      setSubscriptions(data.subscriptions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const createSubscription = useCallback(async (input: CreateSubscriptionInput): Promise<Subscription | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Error al crear la suscripción' }))
        throw new Error(typeof msg === 'string' ? msg : 'Error al crear la suscripción')
      }
      const { subscription } = await res.json() as { subscription: Subscription }
      setSubscriptions(prev => [subscription, ...prev])
      return subscription
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSubscription = useCallback(async (id: string, input: UpdateSubscriptionInput): Promise<Subscription | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al actualizar la suscripción')
      const { subscription } = await res.json() as { subscription: Subscription }
      setSubscriptions(prev => prev.map(s => s.id === id ? subscription : s))
      return subscription
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteSubscription = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/subscriptions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar la suscripción')
      setSubscriptions(prev => prev.filter(s => s.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleActive = useCallback(async (id: string, active: boolean): Promise<boolean> => {
    const updated = await updateSubscription(id, { active })
    return updated !== null
  }, [updateSubscription])

  const paySubscription = useCallback(async (
    id: string,
    amount: number,
    categoryId: string | null,
    walletId: string | null,
    date: string,
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/subscriptions/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, category_id: categoryId, wallet_id: walletId, date }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Error al registrar el pago' }))
        throw new Error(typeof msg === 'string' ? msg : 'Error al registrar el pago')
      }
      const { subscription } = await res.json() as { subscription: Subscription }
      setSubscriptions(prev => prev.map(s => s.id === id ? subscription : s))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const monthlyTotal = subscriptions
    .filter(s => s.active)
    .reduce((sum, s) => {
      if (s.billing_cycle === 'anual')   return sum + s.amount / 12
      if (s.billing_cycle === 'semanal') return sum + s.amount * (52 / 12)
      return sum + s.amount
    }, 0)

  return {
    subscriptions,
    loading,
    error,
    monthlyTotal,
    refresh,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    toggleActive,
    paySubscription,
  }
}
