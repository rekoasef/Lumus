'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validations/profile'
import { useProfile } from '@/hooks/use-profile'
import { SectionHeading } from './section-heading'
import type { Profile } from '@/types'

interface ProfileFormProps {
  initialProfile: Profile
  initialSummary: string
}

const fieldClass =
  'w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent-lumus)] focus:outline-none'

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
    if (ok) {
      reset(data)
      toast.success('Perfil actualizado')
    }
  }

  return (
    <section>
      <SectionHeading index="01" label="Datos personales" />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">Nombre</label>
            <input {...register('name')} className={fieldClass} />
            {errors.name && <p className="mt-1 text-xs text-[var(--danger)]">{errors.name.message}</p>}
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">Ocupación</label>
            <input
              {...register('occupation')}
              placeholder="Ej: Desarrollador"
              className={fieldClass}
            />
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">Fecha de nacimiento</label>
            <input {...register('birth_date')} type="date" className={fieldClass} />
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">Ingreso mensual</label>
            <input
              {...register('monthly_salary', { valueAsNumber: true })}
              type="number"
              step="0.01"
              placeholder="0"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">Contale a Lumus sobre vos</label>
          <textarea
            {...register('life_summary')}
            rows={5}
            placeholder="Tus metas, tu estilo de vida, lo que quieras mejorar..."
            className={`${fieldClass} resize-none leading-6`}
          />
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">Es un espacio libre — queda guardado para vos, no se comparte ni se analiza automáticamente.</p>
        </div>

        {error && (
          <div className="rounded-md border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || saving}
            className="rounded-md bg-[var(--accent-lumus)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  )
}
