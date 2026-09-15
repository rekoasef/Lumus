import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from './access'

type AdminGuard = { admin: User; response: null } | { admin: null; response: NextResponse }

/**
 * La entrada de toda API route de `/api/admin`: sesión y después admin.
 *
 * A quien está logueado pero no es admin se le contesta 404 y no 403, igual que
 * la página: no hace falta confirmarle que la ruta existe.
 *
 * Es imprescindible y no una formalidad: las funciones de base reciben el id
 * del admin por parámetro (service_role no tiene usuario), así que **este
 * chequeo es el único que decide quién puede ejecutarlas**.
 */
export async function requireAdmin(): Promise<AdminGuard> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { admin: null, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  if (!isAdmin(user.id)) {
    return { admin: null, response: NextResponse.json({ error: 'No encontrado' }, { status: 404 }) }
  }
  return { admin: user, response: null }
}
