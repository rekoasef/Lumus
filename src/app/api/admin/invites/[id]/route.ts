import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/api'
import { createServiceClient } from '@/lib/supabase/service'
import { uuidSchema } from '@/lib/validations/admin'

// DELETE /api/admin/invites/:id — cancela una invitación que todavía no se usó
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin, response } = await requireAdmin()
  if (!admin) return response

  const id = uuidSchema.safeParse((await params).id)
  if (!id.success) return NextResponse.json({ error: 'Invitación inválida' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('admin_cancel_invite', {
    p_admin: admin.id,
    p_invite_id: id.data,
  })

  if (error) return NextResponse.json({ error: 'No se pudo cancelar la invitación' }, { status: 500 })
  if (!data) {
    return NextResponse.json({ error: 'La invitación no existe o ya se usó' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
