'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const RESEND_COOLDOWN_SECONDS = 60

function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'signup',
    })

    if (error) {
      setError(
        error.message.includes('expired') || error.message.includes('invalid')
          ? 'Código incorrecto o vencido. Pedí uno nuevo.'
          : error.message
      )
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  async function handleResend() {
    if (cooldown > 0) return
    setError(null)
    setInfo(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })

    if (error) {
      setError(error.message)
      return
    }

    setInfo('Te enviamos un código nuevo.')
    setCooldown(RESEND_COOLDOWN_SECONDS)
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  if (!email) {
    return (
      <div className="lumus-glass rounded-3xl p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Falta el email a verificar.{' '}
          <Link href="/register" className="text-[var(--accent-lumus)] hover:underline">
            Volver a registrarme
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="lumus-glass rounded-3xl p-8">
      <div className="text-center mb-8">
        <div className="mb-5 inline-flex items-center gap-3">
          <div className="relative grid size-11 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
            <Image
              src="/logoLumus.png"
              alt="Lumus"
              width={96}
              height={96}
              className="h-full w-full scale-[2.7] object-cover opacity-80 mix-blend-screen"
              priority
            />
          </div>
          <span className="lumus-heading text-2xl font-semibold text-[#d8d1ff]">LUMUS</span>
        </div>
        <p className="lumus-label text-[#cfc6ff]">Verificá tu cuenta</p>
        <h1 className="lumus-heading mt-4 text-3xl font-bold text-[var(--text-primary)]">Revisá tu email</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Te mandamos un código de 6 dígitos a <span className="text-[var(--text-primary)]">{email}</span>
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

        {error && (
          <div className="bg-[var(--danger-muted)] border border-[var(--danger)]/20 rounded-lg px-3 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {info && !error && (
          <div className="rounded-lg border border-[var(--accent-lumus)]/20 bg-[var(--accent-muted)] px-3 py-2.5 text-sm text-[var(--accent-lumus)]">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-full bg-[var(--accent-lumus)] py-3 text-sm font-bold uppercase text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          style={{ letterSpacing: '0.08em' }}
        >
          {loading ? 'Verificando...' : 'Verificar cuenta'}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
        ¿No te llegó?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-[var(--accent-lumus)] hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
        >
          {cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
        </button>
      </p>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  )
}
