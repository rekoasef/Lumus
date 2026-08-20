'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    })

    if (verifyError) {
      setError(
        verifyError.message.includes('expired') || verifyError.message.includes('invalid')
          ? 'Código incorrecto o vencido. Pedí uno nuevo.'
          : verifyError.message
      )
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (!email) {
    return (
      <div className="lumus-glass rounded-3xl p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Falta el email.{' '}
          <Link href="/forgot-password" className="text-[var(--accent-lumus)] hover:underline">
            Pedir un código
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="lumus-glass rounded-3xl p-8">
      <div className="text-center mb-8">
        <p className="lumus-label text-[#cfc6ff]">Nueva contraseña</p>
        <h1 className="lumus-heading mt-4 text-3xl font-bold text-[var(--text-primary)]">Elegí tu nueva contraseña</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Ingresá el código que te mandamos a <span className="text-[var(--text-primary)]">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
            Código de verificación
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            required
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-center text-lg tracking-[0.4em] text-[var(--text-primary)] placeholder:tracking-normal placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
            Contraseña nueva
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
            Repetí la contraseña
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
          />
        </div>

        {error && (
          <div className="bg-[var(--danger-muted)] border border-[var(--danger)]/20 rounded-lg px-3 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-full bg-[var(--accent-lumus)] py-3 text-sm font-bold uppercase text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          style={{ letterSpacing: '0.08em' }}
        >
          {loading ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
        <Link href="/forgot-password" className="text-[var(--accent-lumus)] hover:underline">
          Pedir un código nuevo
        </Link>
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
