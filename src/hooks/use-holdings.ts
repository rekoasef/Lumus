'use client'

import { useCallback, useState } from 'react'
import type { Holding } from '@/lib/finance/holdings'
import type { CreateHoldingInput, UpdateHoldingInput } from '@/lib/validations/finance'

/** Alta, baja y modificación de tenencias. La valuación se calcula aparte. */
export function useHoldings(initial: Holding[]) {
  const [holdings, setHoldings] = useState<Holding[]>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function call<T>(url: string, init: RequestInit): Promise<T | null> {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo guardar')
      return data as T
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setSaving(false)
    }
  }

  const create = useCallback(async (input: CreateHoldingInput) => {
    const data = await call<{ holding: Holding }>('/api/finance/holdings', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    if (data) setHoldings(prev => [data.holding, ...prev])
    return data?.holding ?? null
  }, [])

  const update = useCallback(async (id: string, input: UpdateHoldingInput) => {
    const data = await call<{ holding: Holding }>(`/api/finance/holdings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    if (data) setHoldings(prev => prev.map(h => (h.id === id ? data.holding : h)))
    return data?.holding ?? null
  }, [])

  const remove = useCallback(async (id: string) => {
    const data = await call<{ ok: boolean }>(`/api/finance/holdings/${id}`, { method: 'DELETE' })
    if (data) setHoldings(prev => prev.filter(h => h.id !== id))
    return Boolean(data)
  }, [])

  return { holdings, saving, error, create, update, remove }
}
