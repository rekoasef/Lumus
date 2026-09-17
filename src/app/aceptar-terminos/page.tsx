import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTermsStatus } from '@/lib/legal/acceptance'
import { TERMS_UPDATED_LABEL, TERMS_VERSION, WITHDRAWAL_BUSINESS_DAYS } from '@/lib/legal/owner'
import { AcceptTermsForm } from '@/components/modules/legal/accept-terms-form'
import { LegalLinks } from '@/components/shared/legal-links'

export const metadata: Metadata = { title: 'Términos — Lumus' }

const LABELS = {
  eyebrow: 'Antes de seguir',
  title: 'Términos y privacidad',
  intro: `Lumus ahora tiene términos y condiciones y política de privacidad (versión del ${TERMS_UPDATED_LABEL}). Lo más importante:`,
  points: [
    'Tus datos son tuyos: no los vendemos, no los usamos para publicidad y el panel de administración de Lumus no muestra tus montos.',
    'Lumus no es asesoramiento financiero: los informes explican tus números, no recomiendan inversiones.',
    `Podés darte de baja cuando quieras, sin costo, y arrepentirte dentro de los ${WITHDRAWAL_BUSINESS_DAYS} días hábiles de suscribirte.`,
    'Si el precio sube, te avisamos con 30 días de anticipación.',
  ],
} as const

/**
 * Para quien ya tenía cuenta cuando se publicaron los términos, o cuando
 * cambia `TERMS_VERSION`. El proxy manda acá antes de dejar usar la app.
 */
export default async function AceptarTerminosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if ((await getTermsStatus(supabase, user.id)) !== 'pending') redirect('/dashboard')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] px-4 py-12">
      <div className="lumus-glass w-full max-w-lg rounded-3xl p-7 sm:p-8">
        <p className="lumus-label text-[0.65rem] text-[var(--accent-lumus)]">{LABELS.eyebrow}</p>
        <h1 className="lumus-heading mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{LABELS.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">{LABELS.intro}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-secondary)] marker:text-[var(--accent-lumus)]">
          {LABELS.points.map(p => <li key={p}>{p}</li>)}
        </ul>
        <div className="mt-7">
          <AcceptTermsForm version={TERMS_VERSION} />
        </div>
      </div>
      <LegalLinks className="mt-8 w-full max-w-lg" />
    </main>
  )
}
