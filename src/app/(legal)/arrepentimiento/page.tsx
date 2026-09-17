import type { Metadata } from 'next'
import { ConsumerRequestPage, type ConsumerRequestCopy } from '@/components/modules/legal/consumer-request-page'
import { LEGAL_PATHS, REQUEST_CONFIRM_HOURS, WITHDRAWAL_BUSINESS_DAYS } from '@/lib/legal/owner'

export const metadata: Metadata = { title: 'Botón de arrepentimiento — Lumus' }

const COPY: ConsumerRequestCopy = {
  eyebrow: 'Botón de arrepentimiento',
  title: 'Arrepentirte de la suscripción',
  intro: `Tenés ${WITHDRAWAL_BUSINESS_DAYS} días hábiles desde que te suscribiste para arrepentirte, sin costo y sin dar motivos (Ley 24.240, artículo 34). No hace falta iniciar sesión.`,
  points: [
    'Escribí el mail de tu cuenta. Te damos un código de identificación en el momento.',
    `Te mandamos un link a ese mail para confirmar que sos vos. Vence en ${REQUEST_CONFIRM_HOURS} horas.`,
    'Al confirmar, cancelamos la suscripción y te devolvemos lo que se te haya cobrado, por el mismo medio de pago.',
  ],
  other: { text: `¿Pasaron más de ${WITHDRAWAL_BUSINESS_DAYS} días hábiles?`, label: 'Darte de baja', href: LEGAL_PATHS.cancellation },
}

export default function ArrepentimientoPage() {
  return <ConsumerRequestPage kind="arrepentimiento" copy={COPY} />
}
