import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteAccountSchema } from '@/lib/validations/profile'
import { deleteAccount, verifyPassword } from '@/lib/account/delete-account'
import { isAdmin } from '@/lib/admin/access'

/** Elimina la cuenta de quien está logueado, con todos sus datos. */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const result = deleteAccountSchema.safeParse(await req.json().catch(() => null))
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  // Un admin que se borra se queda sin el panel para deshacerlo, igual que
  // cuando se revoca su propio acceso (ver `G1`).
  if (isAdmin(user.id)) {
    return NextResponse.json({ error: 'Una cuenta de administrador no se puede eliminar desde acá.' }, { status: 403 })
  }

  // La contraseña se verifica acá y no en el navegador: un chequeo del lado del
  // cliente se saltea llamando a esta ruta directo.
  if (!(await verifyPassword(user.email, result.data.password))) {
    return NextResponse.json({ error: 'La contraseña no es correcta' }, { status: 403 })
  }

  const outcome = await deleteAccount(user.id, user.email)
  if (outcome.kind === 'error') return NextResponse.json({ error: outcome.message }, { status: 502 })

  // La cookie queda apuntando a un usuario que ya no existe: se limpia.
  await supabase.auth.signOut()
  return NextResponse.json({ code: outcome.code })
}
