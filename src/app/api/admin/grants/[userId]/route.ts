import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/api'
import { createServiceClient } from '@/lib/supabase/service'
import { setGrantSchema, uuidSchema } from '@/lib/validations/admin'

type Params = { params: Promise<{ userId: string }> }

// PUT /api/admin/grants/:userId  { reason, expiresAt }
// Otorga una cortesía o le cambia el vencimiento. expiresAt null = sin vencimiento.
export async function PUT(req: NextRequest, { params }: Params) {
  const { admin, response } = await requireAdmin()
  if (!admin) return response

  const userId = uuidSchema.safeParse((await params).userId)
  if (!userId.success) return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 })

  const result = setGrantSchema.safeParse(await req.json().catch(() => null))
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('admin_set_grant', {
    p_admin: admin.id,
    p_user_id: userId.data,
    p_reason: result.data.reason,
    // Omitido = default null en la función = sin vencimiento.
    p_expires_at: result.data.expiresAt ?? undefined,
  })

  if (error) return NextResponse.json({ error: 'No se pudo guardar el acceso' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/grants/:userId — revoca la cortesía. El usuario cae en el
// paywall en su próxima navegación.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { admin, response } = await requireAdmin()
  if (!admin) return response

  const userId = uuidSchema.safeParse((await params).userId)
  if (!userId.success) return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 })

  // La función también lo rechaza; acá se contesta un error legible antes de llegar.
  if (userId.data === admin.id) {
    return NextResponse.json({ error: 'No podés revocar tu propio acceso' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('admin_revoke_grant', {
    p_admin: admin.id,
    p_user_id: userId.data,
  })

  if (error) return NextResponse.json({ error: 'No se pudo revocar el acceso' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Ese usuario no tiene cortesía' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
