'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { confirm } from '@/components/shared/confirm-dialog'
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations/profile'

interface ChangePasswordFormProps {
  email: string
}

export function ChangePasswordForm({ email }: ChangePasswordFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  })

  async function onSubmit(data: ChangePasswordInput) {
    setError(null)
    setSuccess(false)
    const supabase = createClient()

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: data.current_password,
    })
    if (verifyError) {
      setError('La contraseña actual no es correcta')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: data.new_password })
    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    reset()
  }

  async function handleLogout() {
    const confirmed = await confirm({
      title: 'Cerrar sesión',
      description: '¿Seguro que querés cerrar sesión?',
      confirmLabel: 'Cerrar sesión',
      variant: 'default',
    })
    if (!confirmed) return

    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <section className="lumus-glass rounded-3xl p-8">
      <p className="lumus-label text-[#8fd6ff]">Seguridad</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">CONTRASEÑA ACTUAL</label>
          <input
            {...register('current_password')}
            type="password"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
          />
          {errors.current_password && <p className="mt-1 text-xs text-[var(--danger)]">{errors.current_password.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">CONTRASEÑA NUEVA</label>
            <input
              {...register('new_password')}
              type="password"
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.new_password && <p className="mt-1 text-xs text-[var(--danger)]">{errors.new_password.message}</p>}
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">REPETIR CONTRASEÑA</label>
            <input
              {...register('confirm_password')}
              type="password"
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.confirm_password && <p className="mt-1 text-xs text-[var(--danger)]">{errors.confirm_password.message}</p>}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-[var(--success)]/20 bg-[var(--success-muted)] px-3 py-2.5 text-sm text-[var(--success)]">
            Contraseña actualizada.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-muted)] hover:text-[var(--danger)]"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[var(--accent-lumus)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </section>
  )
}
