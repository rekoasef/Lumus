import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/api'
import { createServiceClient } from '@/lib/supabase/service'
import { inviteSchema } from '@/lib/validations/admin'

// POST /api/admin/invites  { email, reason, accessDays }
// Pre-autoriza un mail: al registrarse, recibe la cortesía sola (trigger de
// 00031). Si el mail ya tiene cuenta, el acceso se le da en el momento.
export async function POST(req: NextRequest) {
  const { admin, response } = await requireAdmin()
  if (!admin) return response

  const result = inviteSchema.safeParse(await req.json().catch(() => null))
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { email, reason, accessDays } = result.data
  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('admin_invite', {
    p_admin: admin.id,
    p_email: email,
    p_reason: reason,
    // Omitido = default null en la función = sin vencimiento.
    p_access_days: accessDays ?? undefined,
  })

  if (error) return NextResponse.json({ error: 'No se pudo guardar la invitación' }, { status: 500 })

  return NextResponse.json({ outcome: data }, { status: 201 })
}
