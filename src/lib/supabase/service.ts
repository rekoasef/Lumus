import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Client con service_role — bypassea RLS. Server-only, nunca importar
// desde código de cliente. Uso exclusivo: el webhook de billing, que es
// una ruta pública sin sesión de usuario y necesita actualizar el estado
// de suscripción de cualquier user_id.
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
