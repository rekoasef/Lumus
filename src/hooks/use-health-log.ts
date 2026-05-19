'use client'

import { useState } from 'react'
import type { HealthLog } from '@/types/fit.types'
import type { UpsertHealthLogInput } from '@/lib/validations/fit'

export function useHealthLog(initialLog: HealthLog | null, date: string) {
  const [log, setLog] = useState<HealthLog | null>(initialLog)
  const [isSaving, setIsSaving] = useState(false)

  async function upsert(updates: Partial<UpsertHealthLogInput>): Promise<boolean> {
    setIsSaving(true)
    const res = await fetch('/api/fit/health-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, ...updates }),
    })
    setIsSaving(false)
    if (!res.ok) return false
    const { health_log } = await res.json() as { health_log: HealthLog }
    setLog(health_log)
    return true
  }

  async function addWater(ml: number): Promise<boolean> {
    const current = log?.water_ml ?? 0
    return upsert({ water_ml: current + ml })
  }

  async function setSleep(hours: number): Promise<boolean> {
    return upsert({ sleep_hours: hours })
  }

  async function setSteps(steps: number): Promise<boolean> {
    return upsert({ steps })
  }

  return { log, isSaving, upsert, addWater, setSleep, setSteps }
}
