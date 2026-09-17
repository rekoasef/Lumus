import { NextRequest, NextResponse } from 'next/server'
import { SUPPORT_EMAIL } from '@/lib/contact'
import { consumerRequestSchema } from '@/lib/validations/legal'
import { submitConsumerRequest } from '@/lib/legal/consumer-requests-server'

/**
 * Botón de arrepentimiento y botón de baja del servicio.
 *
 * **Ruta pública, sin chequeo de sesión, a propósito**: la Disposición
 * 954/2025 prohíbe pedir registro o login para usarlos. La identidad se
 * verifica después, con el link que llega al mail de la cuenta (ver
 * `lib/legal/consumer-requests-server`). Está en las rutas abiertas del proxy.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const result = consumerRequestSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  try {
    const { code } = await submitConsumerRequest({
      kind: result.data.kind,
      email: result.data.email,
      reason: result.data.reason || null,
    })
    return NextResponse.json({ code }, { status: 201 })
  } catch (e) {
    console.error('[solicitudes] no se pudo registrar', e)
    return NextResponse.json(
      { error: `No pudimos registrar la solicitud. Probá de nuevo o escribinos a ${SUPPORT_EMAIL}.` },
      { status: 500 },
    )
  }
}
