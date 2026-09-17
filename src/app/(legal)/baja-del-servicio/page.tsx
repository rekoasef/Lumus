import type { Metadata } from 'next'
import { ConsumerRequestPage, type ConsumerRequestCopy } from '@/components/modules/legal/consumer-request-page'
import { LEGAL_PATHS, REQUEST_CONFIRM_HOURS, WITHDRAWAL_BUSINESS_DAYS } from '@/lib/legal/owner'

export const metadata: Metadata = { title: 'Botón de baja del servicio — Lumus' }

const COPY: ConsumerRequestCopy = {
  eyebrow: 'Botón de baja del servicio',
  title: 'Darte de baja de Lumus',
  intro: 'Podés darte de baja cuando quieras, sin costo y sin explicaciones. No hace falta iniciar sesión: también podés hacerlo desde tu perfil.',
  points: [
    'Escribí el mail de tu cuenta. Te damos un código de identificación en el momento.',
    `Te mandamos un link a ese mail para confirmar que sos vos. Vence en ${REQUEST_CONFIRM_HOURS} horas.`,
    'Al confirmar, cancelamos la suscripción: no se hacen más cobros y conservás el acceso hasta el final del período que ya pagaste. Tus datos quedan guardados por si volvés.',
  ],
  other: { text: `¿Te suscribiste hace menos de ${WITHDRAWAL_BUSINESS_DAYS} días hábiles?`, label: 'Usá el botón de arrepentimiento', href: LEGAL_PATHS.withdrawal },
}

export default function BajaDelServicioPage() {
  return <ConsumerRequestPage kind="baja" copy={COPY} />
}
