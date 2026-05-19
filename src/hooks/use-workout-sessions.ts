'use client'

import { useState } from 'react'
import type { WorkoutSession } from '@/types/fit.types'
import type { CreateSessionInput } from '@/lib/validations/fit'

export function useWorkoutSessions(initialSessions: WorkoutSession[]) {
  const [sessions, setSessions] = useState<WorkoutSession[]>(initialSessions)

  function getSessionsForDate(date: string): WorkoutSession[] {
    return sessions.filter(s => s.date === date)
  }

  async function logSession(input: CreateSessionInput): Promise<boolean> {
    const res = await fetch('/api/fit/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return false
    const { session } = await res.json() as { session: WorkoutSession }
    setSessions(prev => [session, ...prev])
    return true
  }

  async function deleteSession(id: string): Promise<boolean> {
    const res = await fetch(`/api/fit/sessions/${id}`, { method: 'DELETE' })
    if (!res.ok) return false
    setSessions(prev => prev.filter(s => s.id !== id))
    return true
  }

  const totalSessionsThisWeek = (() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    return sessions.filter(s => s.date >= weekAgo && s.completed).length
  })()

  return { sessions, totalSessionsThisWeek, getSessionsForDate, logSession, deleteSession }
}
