import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/api'
import { createServiceClient } from '@/lib/supabase/service'
import { feedbackStatusSchema, uuidSchema } from '@/lib/validations/admin'

// PATCH /api/admin/feedback/:id  { status: 'nuevo' | 'visto' | 'resuelto' }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin, response } = await requireAdmin()
  if (!admin) return response

  const id = uuidSchema.safeParse((await params).id)
  if (!id.success) return NextResponse.json({ error: 'Reporte inválido' }, { status: 400 })

  const result = feedbackStatusSchema.safeParse(await req.json().catch(() => null))
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('admin_set_feedback_status', {
    p_admin: admin.id,
    p_feedback_id: id.data,
    p_status: result.data.status,
  })

  if (error) return NextResponse.json({ error: 'No se pudo actualizar el reporte' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
