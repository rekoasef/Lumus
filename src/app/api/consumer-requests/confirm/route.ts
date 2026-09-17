import { NextRequest, NextResponse } from 'next/server'
import { SUPPORT_EMAIL } from '@/lib/contact'
import { confirmConsumerRequestSchema } from '@/lib/validations/legal'
import { confirmConsumerRequest } from '@/lib/legal/consumer-requests-server'

/**
 * Confirma una solicitud de arrepentimiento o de baja desde el link del mail.
 *
 * **Ruta pública**: la autorización es el token, que solo llegó al mail de la
 * cuenta. Va por POST y no al abrir el link, para que un antivirus que
 * "visita" los links de los mails no dé de baja a nadie.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const result = confirmConsumerRequestSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ status: 'invalid' }, { status: 400 })

  try {
    const outcome = await confirmConsumerRequest(result.data.token)
    return NextResponse.json(outcome, { status: outcome.status === 'done' ? 200 : 409 })
  } catch (e) {
    console.error('[solicitudes] no se pudo confirmar', e)
    return NextResponse.json(
      { error: `No pudimos completar la solicitud. Probá de nuevo en unos minutos o escribinos a ${SUPPORT_EMAIL}.` },
      { status: 502 },
    )
  }
}
