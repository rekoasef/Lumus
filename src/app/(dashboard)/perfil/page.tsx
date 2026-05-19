import { createClient } from '@/lib/supabase/server'
import { Activity, BadgeDollarSign, GraduationCap, Ruler, Scale, User } from 'lucide-react'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('name, occupation, education, weight_kg, height_cm, monthly_salary, birth_date')
    .eq('user_id', user.id)
    .single()

  const { data: summary } = await supabase
    .from('user_life_summary')
    .select('content')
    .eq('user_id', user.id)
    .single()

  const profileItems = [
    { label: 'Nombre', value: profile?.name, icon: User },
    { label: 'Ocupación', value: profile?.occupation, icon: Activity },
    { label: 'Estudios', value: profile?.education, icon: GraduationCap },
    { label: 'Peso', value: profile?.weight_kg ? `${profile.weight_kg} kg` : null, icon: Scale },
    { label: 'Altura', value: profile?.height_cm ? `${profile.height_cm} cm` : null, icon: Ruler },
    { label: 'Ingreso', value: profile?.monthly_salary ? `$${profile.monthly_salary.toLocaleString('es-AR')}` : null, icon: BadgeDollarSign },
  ]

  return (
    <div className="min-h-screen px-5 py-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[980px]">
        <header className="mb-9">
          <p className="lumus-label text-[#cfc6ff]">Perfil</p>
          <h1 className="lumus-heading mt-4 text-4xl font-bold text-[var(--text-primary)] md:text-5xl">
            Información personal
          </h1>
          <p className="mt-4 text-base text-[var(--text-secondary)]">{user.email}</p>
        </header>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {profileItems.map(({ label, value, icon: Icon }) => (
            <div key={label} className="lumus-glass rounded-2xl p-6">
              <Icon size={22} className="text-[#bdb4ff]" />
              <p className="lumus-label mt-8 text-[0.62rem] text-[var(--text-muted)]">{label}</p>
              <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{value ?? '--'}</p>
            </div>
          ))}
        </section>

        <section className="lumus-glass mt-7 rounded-3xl p-8">
          <p className="lumus-label text-[#ffb86e]">Resumen de vida</p>
          <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-[var(--text-secondary)]">
            {summary?.content ?? 'Todavía no hay contexto personal archivado.'}
          </p>
        </section>
      </div>
    </div>
  )
}
