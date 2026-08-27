import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * Marca avisos como leídos.
 *
 * Sin `id` marca todos. Escribe con el cliente del usuario a propósito: RLS y
 * el trigger de `00022` garantizan que solo pueda tocar `read_at` de lo suyo,
 * así que no hace falta `service_role` para esto.
 */
const readSchema = z.object({
  id: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = readSchema.safeParse(body ?? {})
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })
  }

  let query = supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)

  if (parsed.data.id) query = query.eq('id', parsed.data.id)

  const { error } = await query
  if (error) {
    return NextResponse.json({ error: 'No se pudo marcar como leído' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
