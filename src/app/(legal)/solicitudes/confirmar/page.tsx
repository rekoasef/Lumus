import type { Metadata } from 'next'
import Link from 'next/link'
import { ConfirmRequestButton } from '@/components/modules/legal/confirm-request-button'
import { peekConsumerRequest } from '@/lib/legal/consumer-requests-server'
import { LEGAL_PATHS } from '@/lib/legal/owner'

export const metadata: Metadata = { title: 'Confirmar solicitud — Lumus', robots: { index: false } }
export const dynamic = 'force-dynamic'

const LABELS = {
  eyebrow: 'Código',
  title: { arrepentimiento: 'Confirmá tu arrepentimiento', baja: 'Confirmá tu baja' },
  body: {
    arrepentimiento: 'Al confirmar cancelamos tu suscripción y te devolvemos lo que se te haya cobrado.',
    baja: 'Al confirmar cancelamos tu suscripción: no se hacen más cobros y conservás el acceso hasta el final del período pagado.',
  },
  invalidTitle: 'Este link no sirve',
  invalidBody: 'Puede estar cortado por el cliente de correo. Probá copiarlo entero, o hacé la solicitud de nuevo.',
  alreadyTitle: 'Esta solicitud ya se confirmó',
  alreadyBody: 'No hace falta hacer nada más. Te mandamos la constancia por mail.',
  expiredTitle: 'El link venció',
  expiredBody: 'Hacé la solicitud de nuevo: te damos un código y un link nuevos.',
  again: 'Hacer la solicitud de nuevo',
} as const

/**
 * El link del mail. Solo **lee** la solicitud: la baja la ejecuta el botón,
 * por POST, para que un antivirus que abre los links de los mails no dé de
 * baja a nadie.
 */
export default async function ConfirmarSolicitudPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const state = token ? await peekConsumerRequest(token) : { status: 'invalid' as const }

  return (
    <div className="mx-auto max-w-md">
      <div className="lumus-glass rounded-3xl p-7">
        {state.status === 'pending' && token ? (
          <>
            <p className="lumus-label text-[0.62rem] text-[var(--text-muted)]">{LABELS.eyebrow}</p>
            <p className="mt-1 font-mono text-xl font-bold tracking-[0.12em] text-[var(--text-primary)]">{state.code}</p>
            <h1 className="lumus-heading mt-6 text-2xl font-bold text-[var(--text-primary)]">{LABELS.title[state.kind]}</h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{LABELS.body[state.kind]}</p>
            <div className="mt-7">
              <ConfirmRequestButton token={token} kind={state.kind} />
            </div>
          </>
        ) : (
          <>
            <h1 className="lumus-heading text-2xl font-bold text-[var(--text-primary)]">
              {state.status === 'already' ? LABELS.alreadyTitle : state.status === 'expired' ? LABELS.expiredTitle : LABELS.invalidTitle}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {state.status === 'already' ? LABELS.alreadyBody : state.status === 'expired' ? LABELS.expiredBody : LABELS.invalidBody}
            </p>
            {'code' in state && (
              <p className="mt-4 font-mono text-sm tracking-[0.12em] text-[var(--text-muted)]">{state.code}</p>
            )}
            {state.status !== 'already' && (
              <Link href={LEGAL_PATHS.cancellation} className="mt-6 inline-block text-sm text-[var(--accent-lumus)] hover:underline">
                {LABELS.again}
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
