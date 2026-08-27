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
 */

const unsubscribeSchema = z.object({
  token: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = unsubscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })
  }

  const userId = readUnsubscribeToken(parsed.data.token)
  if (!userId) {
    return NextResponse.json({ error: 'El link no es válido' }, { status: 400 })
  }

  try {
    await setEmailPreference(createServiceClient(), userId, 'vencimiento', false)
  } catch (error) {
    console.error('[avisos] no se pudo dar de baja', error)
    return NextResponse.json({ error: 'No se pudo guardar la baja' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
