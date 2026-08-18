'use client'

import { useState, useCallback } from 'react'
import type { Profile, BillingStatus } from '@/types'
import type { UpdateProfileInput } from '@/lib/validations/profile'

interface UpdateProfileResult {
  profile: Profile
  life_summary: string | null
}

export function useProfile(initialProfile: Profile, initialSummary: string) {
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [summary, setSummary] = useState(initialSummary)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = useCallback(async (input: UpdateProfileInput): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json() as UpdateProfileResult | { error: string }
      if (!res.ok) throw new Error('error' in data ? String(data.error) : 'Error al guardar los cambios')
      const { profile: updated, life_summary } = data as UpdateProfileResult
      setProfile(updated)
      if (life_summary !== null) setSummary(life_summary)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  return { profile, summary, saving, error, updateProfile }
}

export function useSubscriptionCancel() {
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancelSubscription = useCallback(async (): Promise<BillingStatus | null> => {
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/cancel-subscription', { method: 'POST' })
      const data = await res.json() as { status: BillingStatus } | { error: string }
      if (!res.ok) throw new Error('error' in data ? String(data.error) : 'No se pudo cancelar la suscripción')
      return (data as { status: BillingStatus }).status
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setCancelling(false)
    }
  }, [])

  return { cancelling, error, cancelSubscription }
}
