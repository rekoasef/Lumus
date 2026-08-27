import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { allChannelsFor, indexPreferences } from '@/lib/notifications/preferences'
import { NOTIFICATION_TYPES, NOTIFICATION_TYPE_INFO } from '@/types/notifications.types'

/**
 * Preferencias de aviso del usuario.
 *
 * El GET devuelve **todos** los tipos con sus defaults ya aplicados, no las
 * filas crudas: el cliente no tiene que saber que "sin fila" significa algo.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('notification_preferences')
    .select('user_id, type, in_app_enabled, email_enabled')
    .eq('user_id', user.id)

  return NextResponse.json({ preferences: allChannelsFor(indexPreferences(data ?? []), user.id) })
}

const updateSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  inApp: z.boolean(),
  email: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const parsed = updateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })
  }

  const { type, inApp, email } = parsed.data

  // Un aviso que no se puede apagar tampoco se puede apagar por la API: si no
  // llega, el usuario pierde algo sin enterarse de por qué.
  if (!NOTIFICATION_TYPE_INFO[type].canDisable) {
    return NextResponse.json({ error: 'Este aviso no se puede desactivar' }, { status: 400 })
  }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        type,
        in_app_enabled: inApp,
        email_enabled: email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,type' },
    )

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
