import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { readUnsubscribeToken } from '@/lib/notifications/unsubscribe-token'
import { setEmailPreference } from '@/lib/notifications/notifications'

/**
 * Baja de los avisos por mail, sin login.
 *
 * No verifica sesión a propósito: el link viene del pie de un mail y tiene que
 * funcionar para alguien que ya no entra a la app — que es justamente quien
 * más quiere darse de baja. La autorización la da el token firmado.
 *
 * Es POST y no GET porque los escáneres de links de los clientes de correo
 * siguen los GET, y una baja disparada por un antivirus es una baja que el
 * usuario nunca pidió.
 *
 * Atiende dos clientes distintos:
 *
 * 1. La pantalla `/baja`, que manda JSON y puede además volver a activarlos.
 * 2. **El botón de baja del propio Gmail** (`List-Unsubscribe-Post`), que
 *    manda un form-encoded con `List-Unsubscribe=One-Click` y el token en la
 *    query. Ese header es parte de lo que Gmail exige desde 2024 para no
 *    tratar un remitente como sospechoso.
 */

const jsonSchema = z.object({
  token: z.string().min(1),
  // Volver a activarlos usa el mismo token: el link del mail es lo único que
  // tiene quien ya no entra a la app, así que también es su forma de volver.
  enabled: z.boolean().default(false),
})

interface UnsubscribeRequest {
  token: string
  enabled: boolean
}

async function readRequest(req: NextRequest): Promise<UnsubscribeRequest | null> {
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => null)
    const parsed = jsonSchema.safeParse(body)
    return parsed.success ? parsed.data : null
  }

  // One-click: el token viaja en la query porque el cuerpo lo fija el estándar.
  const token = req.nextUrl.searchParams.get('token')
  return token ? { token, enabled: false } : null
}

export async function POST(req: NextRequest) {
  const request = await readRequest(req)
  if (!request) {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })
  }

  const userId = readUnsubscribeToken(request.token)
  if (!userId) {
    return NextResponse.json({ error: 'El link no es válido' }, { status: 400 })
  }

  try {
    await setEmailPreference(createServiceClient(), userId, 'vencimiento', request.enabled)
  } catch (error) {
    console.error('[avisos] no se pudo guardar la preferencia', error)
    return NextResponse.json({ error: 'No se pudo guardar el cambio' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, enabled: request.enabled })
}
