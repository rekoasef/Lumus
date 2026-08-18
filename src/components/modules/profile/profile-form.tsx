'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validations/profile'
import { useProfile } from '@/hooks/use-profile'
import type { Profile } from '@/types'

interface ProfileFormProps {
  initialProfile: Profile
  initialSummary: string
}

export function ProfileForm({ initialProfile, initialSummary }: ProfileFormProps) {
  const { profile, summary, saving, error, updateProfile } = useProfile(initialProfile, initialSummary)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile.name,
      occupation: profile.occupation,
      birth_date: profile.birth_date,
      monthly_salary: profile.monthly_salary,
      life_summary: summary,
    },
  })

  async function onSubmit(data: UpdateProfileInput) {
    const ok = await updateProfile(data)
    if (ok) reset(data)
  }

  return (
    <section className="lumus-glass rounded-3xl p-8">
      <p className="lumus-label text-[#cfc6ff]">Datos personales</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">NOMBRE</label>
            <input
              {...register('name')}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.name && <p className="mt-1 text-xs text-[var(--danger)]">{errors.name.message}</p>}
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">OCUPACIÓN</label>
            <input
              {...register('occupation')}
              placeholder="Ej: Desarrollador"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">FECHA DE NACIMIENTO</label>
            <input
              {...register('birth_date')}
              type="date"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">INGRESO MENSUAL</label>
            <input
              {...register('monthly_salary', { valueAsNumber: true })}
              type="number"
              step="0.01"
              placeholder="0"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
            CONTALE A LUMUS SOBRE VOS
          </label>
          <textarea
            {...register('life_summary')}
            rows={5}
            placeholder="Tus metas, tu estilo de vida, lo que quieras mejorar..."
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || saving}
            className="rounded-lg bg-[var(--accent-lumus)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  )
}
