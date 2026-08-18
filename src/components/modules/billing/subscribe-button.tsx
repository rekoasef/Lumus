'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 40 // ~2 minutos

interface SubscribeButtonProps {
  pendingCheck?: boolean
}

export function SubscribeButton({ pendingCheck = false }: SubscribeButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(pendingCheck)
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!pendingCheck) return

    const interval = setInterval(async () => {
      attemptsRef.current += 1

      const res = await fetch('/api/billing/status')
      const data = await res.json()

      if (data.status === 'authorized') {
        clearInterval(interval)
        router.push('/dashboard')
        router.refresh()
        return
      }

      if (attemptsRef.current >= POLL_MAX_ATTEMPTS) {
        clearInterval(interval)
        setChecking(false)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [pendingCheck, router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleClick() {
    setError(null)
    setLoading(true)

    const res = await fetch('/api/billing/create-subscription', { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'No se pudo iniciar el pago')
      setLoading(false)
      return
    }

    window.location.href = data.init_point
  }

  return (
    <div>
      {checking && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--accent-lumus)]/20 bg-[var(--accent-muted)] px-3 py-2.5 text-sm text-[var(--accent-lumus)]">
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Esperando la confirmación del pago...
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-full bg-[var(--accent-lumus)] py-3 text-sm font-bold uppercase text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
        style={{ letterSpacing: '0.08em' }}
      >
        {loading ? 'Redirigiendo...' : 'Suscribirme'}
      </button>
      {error && (
        <div className="mt-4 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-2.5 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:underline"
      >
        Cerrar sesión
      </button>
    </div>
  )
}
