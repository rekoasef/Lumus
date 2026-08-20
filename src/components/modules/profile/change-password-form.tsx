'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { confirm } from '@/components/shared/confirm-dialog'
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations/profile'
import { SectionHeading } from './section-heading'

const LABELS = {
  title: 'Cambiar contraseña',
  hint: 'Vas a necesitar la actual',
} as const

interface ChangePasswordFormProps {
  email: string
}

export function ChangePasswordForm({ email }: ChangePasswordFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  // Colapsado por default: cambiar la contraseña es algo que se hace una vez
  // cada mucho, no tiene por qué ocupar media pantalla del perfil.
  const [open, setOpen] = useState(false)

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

    toast.success('Contraseña actualizada')
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
    <section>
      <SectionHeading
        index="03"
        label="Seguridad"
        action={
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
          >
            Cerrar sesión
          </button>
        }
      />

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/15"
      >
        <span>
          <span className="block text-sm text-[var(--text-primary)]">{LABELS.title}</span>
          <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{LABELS.hint}</span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="password-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">Contraseña actual</label>
          <input
            {...register('current_password')}
            type="password"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
          />
          {errors.current_password && <p className="mt-1 text-xs text-[var(--danger)]">{errors.current_password.message}</p>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">Contraseña nueva</label>
            <input
              {...register('new_password')}
              type="password"
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.new_password && <p className="mt-1 text-xs text-[var(--danger)]">{errors.new_password.message}</p>}
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">Repetir contraseña</label>
            <input
              {...register('confirm_password')}
              type="password"
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.confirm_password && <p className="mt-1 text-xs text-[var(--danger)]">{errors.confirm_password.message}</p>}
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-[var(--accent-lumus)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
