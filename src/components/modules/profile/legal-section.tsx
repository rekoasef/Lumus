import { LegalLinks } from '@/components/shared/legal-links'
import { DATA_DELETION_BUSINESS_DAYS, LEGAL_OWNER } from '@/lib/legal/owner'
import { SectionHeading } from './section-heading'

const LABELS = {
  heading: 'Legal y soporte',
  support: `¿Dudas o problemas? Escribinos a ${LEGAL_OWNER.email}: respondemos dentro de las 48 horas hábiles.`,
  deletion: `Para ver, corregir o borrar tus datos, escribinos desde el mail de tu cuenta. Borramos la cuenta y todo lo que cargaste dentro de los ${DATA_DELETION_BUSINESS_DAYS} días hábiles.`,
} as const

export function LegalSection() {
  return (
    <section>
      <SectionHeading index="05" label={LABELS.heading} />
      <div className="mt-6 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        <p>{LABELS.support}</p>
        <p>{LABELS.deletion}</p>
      </div>
      <LegalLinks className="mt-6" showOwner />
    </section>
  )
}
