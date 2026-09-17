import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { createServiceClient } from '@/lib/supabase/service'
import { cancelSubscriptionFor } from '@/lib/billing/cancel'
import { generateRequestCode } from '@/lib/legal/consumer-requests'
import { notifyOwner, sendRequestDone } from '@/lib/legal/request-emails'

/**
 * Eliminar la cuenta desde el perfil: la baja del servicio y el borrado de los
 * datos (art. 16, Ley 25.326) en un solo paso.
 *
 * El orden importa:
 *
 * 1. **Cancelar la suscripción primero.** Si Mercado Pago falla, no se borra
 *    nada: una cuenta borrada con el débito todavía activo es el peor final
 *    posible, porque la persona ya no tiene desde dónde darse de baja.
 * 2. **Dejar la constancia** en `consumer_requests`, que sobrevive al borrado
 *    (su `user_id` queda en null).
 * 3. **Borrar el usuario** con la API de Auth. Todo lo suyo se va en cascada
 *    (funciona desde `00036`).
 */

export type DeleteAccountResult =
  | { kind: 'deleted'; code: string }
  | { kind: 'error'; message: string }

const OUTCOME =
  'Eliminamos tu cuenta y todos los datos que cargaste. Si tenías una suscripción, la cancelamos: no se van a hacer más cobros.'

/**
 * Confirma que quien pide el borrado sabe la contraseña. Con un cliente propio
 * y sin guardar sesión: no toca la cookie de quien está navegando.
 */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) return false
  // La sesión nueva no se usa para nada: se cierra enseguida.
  await client.auth.signOut()
  return true
}

/** **Quien la llama ya verificó la sesión y la contraseña de `userId`.** */
export async function deleteAccount(userId: string, email: string): Promise<DeleteAccountResult> {
  const service = createServiceClient()

  const cancel = await cancelSubscriptionFor(service, userId)
  if (cancel.kind === 'error') {
    return { kind: 'error', message: 'No pudimos cancelar tu suscripción en Mercado Pago, así que no borramos nada. Probá de nuevo en unos minutos.' }
  }

  const code = generateRequestCode('baja')
  const now = new Date().toISOString()
  const { error: logError } = await service.from('consumer_requests').insert({
    code,
    kind: 'baja',
    email,
    user_id: userId,
    reason: 'Eliminó la cuenta desde el perfil',
    status: 'resuelta',
    outcome: OUTCOME,
    confirmed_at: now,
    resolved_at: now,
  })
  if (logError) return { kind: 'error', message: `No pudimos registrar la baja: ${logError.message}` }

  const { error: deleteError } = await service.auth.admin.deleteUser(userId)
  if (deleteError) {
    // La suscripción ya quedó cancelada; la cuenta no. Queda la constancia para
    // que el dueño la termine de borrar a mano.
    await notifyOwner({
      event: 'confirmada',
      kind: 'baja',
      code,
      email,
      hasAccount: true,
      reason: 'Eliminar cuenta desde el perfil',
      detail: `FALLÓ el borrado de la cuenta (${deleteError.message}). La suscripción ya está cancelada: borrarla a mano.`,
    })
    return { kind: 'error', message: 'Cancelamos tu suscripción pero no pudimos borrar la cuenta. Ya nos avisaron y la borramos a mano en los próximos días.' }
  }

  await sendRequestDone(email, 'baja', code, OUTCOME)
  await notifyOwner({
    event: 'confirmada',
    kind: 'baja',
    code,
    email,
    hasAccount: false,
    reason: 'Eliminar cuenta desde el perfil',
    detail: cancel.kind === 'cancelled'
      ? `Cuenta y datos borrados. Tenía suscripción: cancelada en Mercado Pago (${cancel.status}). Si se suscribió hace menos de 10 días hábiles, puede corresponder un reintegro.`
      : 'Cuenta y datos borrados. No tenía suscripción activa.',
  })

  return { kind: 'deleted', code }
}
