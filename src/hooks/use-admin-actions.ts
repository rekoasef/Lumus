'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FeedbackStatusInput, InviteInput, SetGrantInput } from '@/lib/validations/admin'

export type InviteOutcome = 'invited' | 'granted_existing'

async function send(url: string, method: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data: unknown = await res.json().catch(() => ({}))
  const record: Record<string, unknown> = data !== null && typeof data === 'object' ? Object.fromEntries(Object.entries(data)) : {}
  if (!res.ok) {
    throw new Error(typeof record.error === 'string' ? record.error : 'No se pudo completar la acción')
  }
  return record
}

/**
 * Las acciones del panel de admin. Después de cada una se refresca la página:
 * los números del panel salen del server, y un contador que no se actualiza
 * después de dar un acceso hace dudar de si se dio.
 */
export function useAdminActions() {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  const run = useCallback(async <T,>(key: string, action: () => Promise<T>): Promise<T> => {
    setPending(key)
    try {
      const result = await action()
      router.refresh()
      return result
    } finally {
      setPending(null)
    }
  }, [router])

  const invite = useCallback((input: InviteInput) =>
    run('invite', async () => {
      const data = await send('/api/admin/invites', 'POST', input)
      return (data.outcome === 'granted_existing' ? 'granted_existing' : 'invited') satisfies InviteOutcome
    }), [run])

  const cancelInvite = useCallback((id: string) =>
    run(`invite:${id}`, () => send(`/api/admin/invites/${id}`, 'DELETE')), [run])

  const setGrant = useCallback((userId: string, input: SetGrantInput) =>
    run(`grant:${userId}`, () => send(`/api/admin/grants/${userId}`, 'PUT', input)), [run])

  const revokeGrant = useCallback((userId: string) =>
    run(`grant:${userId}`, () => send(`/api/admin/grants/${userId}`, 'DELETE')), [run])

  const setFeedbackStatus = useCallback((id: string, input: FeedbackStatusInput) =>
    run(`feedback:${id}`, () => send(`/api/admin/feedback/${id}`, 'PATCH', input)), [run])

  return { pending, invite, cancelInvite, setGrant, revokeGrant, setFeedbackStatus }
}
