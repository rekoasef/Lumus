'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type Step = 1 | 2 | 3

interface ProfileData {
  name: string
  birthDate: string
  weightKg: string
  heightCm: string
  occupation: string
  education: string
  monthlySalary: string
}

const STEP_LABELS = ['Bienvenida', 'Perfil', 'Contexto']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    birthDate: '',
    weightKg: '',
    heightCm: '',
    occupation: '',
    education: '',
    monthlySalary: '',
  })
  const [lifeSummary, setLifeSummary] = useState('')

  function handleProfileChange(field: keyof ProfileData, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  async function handleFinish() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    await supabase.from('user_profiles').upsert({
      user_id: user.id,
      name: profile.name,
      birth_date: profile.birthDate || null,
      weight_kg: profile.weightKg ? parseFloat(profile.weightKg) : null,
      height_cm: profile.heightCm ? parseFloat(profile.heightCm) : null,
      occupation: profile.occupation || null,
      education: profile.education || null,
      monthly_salary: profile.monthlySalary ? parseFloat(profile.monthlySalary) : null,
      onboarding_done: true,
    })

    if (lifeSummary.trim()) {
      await supabase.from('user_life_summary').upsert({
        user_id: user.id,
        content: lifeSummary,
      })
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-10">
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as Step
          const active = s === step
          const done = s < step
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                active
                  ? 'bg-[var(--accent-lumus)] text-[#190f5d]'
                  : done
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                    : 'border border-white/[0.08] bg-white/[0.035] text-[var(--text-muted)]'
              }`} style={{ letterSpacing: '0.06em' }}>
                <span>{s}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-8 h-px ${done ? 'bg-[var(--accent-lumus)]' : 'bg-[var(--border)]'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="w-full max-w-lg">
        {/* Paso 1 — Bienvenida */}
        {step === 1 && (
          <div className="text-center">
            <div className="relative mx-auto mb-6 grid size-20 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-[var(--shadow-accent)]">
              <Image
                src="/logoLumus.png"
                alt="Lumus"
                width={120}
                height={120}
                className="h-full w-full scale-[2.6] object-cover opacity-80 mix-blend-screen"
                priority
              />
            </div>
            <p className="lumus-label mb-4 text-[#cfc6ff]">Lumus OS</p>
            <h1 className="lumus-heading mb-3 text-4xl font-bold text-[var(--text-primary)]">
              Inicializa tu sistema personal
            </h1>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-2">
              Una capa de organización para tareas, finanzas, salud, hábitos e inteligencia contextual.
            </p>
            <p className="mb-8 text-sm leading-relaxed text-[var(--text-secondary)]">
              Estos datos ayudan a Lumus a calibrar el panel, tus rutinas y el contexto de IA.
            </p>
            <button
              onClick={() => setStep(2)}
              className="rounded-full bg-[var(--accent-lumus)] px-8 py-3 text-sm font-bold uppercase text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)]"
              style={{ letterSpacing: '0.08em' }}
            >
              Empezar
            </button>
          </div>
        )}

        {/* Paso 2 — Perfil */}
        {step === 2 && (
          <div className="lumus-glass rounded-3xl p-6">
            <h2 className="lumus-heading mb-1 text-2xl font-semibold text-[var(--text-primary)]">Tu perfil</h2>
            <p className="mb-6 text-sm text-[var(--text-secondary)]">Esta información ayuda a Lumus a personalizar tu experiencia.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => handleProfileChange('name', e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={profile.birthDate}
                    onChange={e => handleProfileChange('birthDate', e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm text-[var(--text-primary)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    value={profile.weightKg}
                    onChange={e => handleProfileChange('weightKg', e.target.value)}
                    placeholder="75"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    value={profile.heightCm}
                    onChange={e => handleProfileChange('heightCm', e.target.value)}
                    placeholder="175"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                    Ingreso mensual (ARS)
                  </label>
                  <input
                    type="number"
                    value={profile.monthlySalary}
                    onChange={e => handleProfileChange('monthlySalary', e.target.value)}
                    placeholder="500000"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                  Ocupación
                </label>
                <input
                  type="text"
                  value={profile.occupation}
                  onChange={e => handleProfileChange('occupation', e.target.value)}
                  placeholder="Desarrollador, diseñador, estudiante..."
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                  Estudios
                </label>
                <input
                  type="text"
                  value={profile.education}
                  onChange={e => handleProfileChange('education', e.target.value)}
                  placeholder="Universitario, bootcamp, autodidacta..."
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.035] py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/[0.055]"
              >
                Atrás
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!profile.name.trim()}
                className="flex-1 rounded-xl bg-[var(--accent-lumus)] py-2.5 text-sm font-bold text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Paso 3 — Campo libre */}
        {step === 3 && (
          <div className="lumus-glass rounded-3xl p-6">
            <h2 className="lumus-heading mb-1 text-2xl font-semibold text-[var(--text-primary)]">Contexto personal</h2>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Es opcional, pero valioso. Cuanto más contexto tenga Lumus, mejor va a poder ayudarte.
            </p>
            <textarea
              value={lifeSummary}
              onChange={e => setLifeSummary(e.target.value)}
              placeholder="Contale a Lumus tus objetivos, proyectos, rutinas, límites y lo que querés mejorar..."
              rows={8}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30"
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.035] py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/[0.055]"
              >
                Atrás
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex-1 rounded-xl bg-[var(--accent-lumus)] py-2.5 text-sm font-bold text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Entrar a Lumus'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
