'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(
        error.message === 'User already registered'
          ? 'Este email ya está registrado'
          : error.message
      )
      setLoading(false)
      return
    }

    // Si ya hay sesión (confirmación de mail deshabilitada en el proyecto), entra directo.
    if (data.session) {
      router.push('/onboarding')
      router.refresh()
      return
    }

    router.push(`/verify?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="lumus-glass rounded-3xl p-8">
      <div className="text-center mb-8">
        <p className="lumus-label text-[#cfc6ff]">Crear cuenta</p>
        <h1 className="lumus-heading mt-4 text-3xl font-bold text-[var(--text-primary)]">Inicializa Lumus</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
            Contraseña
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

        {error && (
          <div className="bg-[var(--danger-muted)] border border-[var(--danger)]/20 rounded-lg px-3 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--accent-lumus)] py-3 text-sm font-bold uppercase text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          style={{ letterSpacing: '0.08em' }}
        >
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="text-[var(--accent-lumus)] hover:underline">
          Ingresar
        </Link>
      </p>
    </div>
  )
}
