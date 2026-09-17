import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

interface MpPreapprovalResponse {
  id: string
  status: string
}

/** Los estados de Mercado Pago que todavía pueden terminar en un cobro. */
const CANCELLABLE = new Set(['authorized', 'pending'])

export type CancelResult =
  | { kind: 'cancelled'; status: string }
  /** No había nada que cancelar: prueba gratis, cortesía, o ya cancelada. */
  | { kind: 'nothing_to_cancel' }
  | { kind: 'error'; message: string }

/**
 * Cancela la suscripción de Mercado Pago de un usuario y guarda el estado.
 *
 * La usan la baja desde el perfil y los botones de baja y arrepentimiento, que
 * corren sin sesión: por eso recibe el cliente con `service_role` y el id, en
 * vez de leer al usuario de la cookie. **Quien la llama es responsable de haber
 * verificado que ese id es el de quien pide la baja.**
 *
 * El acceso no se corta acá: dura hasta `paid_until` (ver `lib/billing/access`).
 */
export async function cancelSubscriptionFor(service: SupabaseClient<Database>, userId: string): Promise<CancelResult> {
  const { data: subscription, error: readError } = await service
    .from('billing_subscriptions')
    .select('status, mp_preapproval_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) return { kind: 'error', message: readError.message }
  // `pending` también: es un checkout que la persona empezó y no terminó. Si
  // se deja vivo, puede completarlo más tarde desde el link de Mercado Pago y
  // empezar a pagar después de haberse dado de baja (o de borrar la cuenta).
  if (!subscription || !CANCELLABLE.has(subscription.status) || !subscription.mp_preapproval_id) {
    return { kind: 'nothing_to_cancel' }
  }

  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${subscription.mp_preapproval_id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  })

  if (!mpRes.ok) {
    const body = await mpRes.text()
    // Una pendiente que MP no deja cancelar suele ser un checkout vencido, que
    // ya no puede cobrar. No puede frenar una baja ni un borrado de cuenta.
    if (subscription.status === 'pending') {
      console.warn('[baja] MP no canceló una suscripción pendiente; se sigue igual', mpRes.status, body)
      return { kind: 'nothing_to_cancel' }
    }
    return { kind: 'error', message: `Mercado Pago: ${body}` }
  }

  const preapproval = await mpRes.json() as MpPreapprovalResponse

  const { error } = await service
    .from('billing_subscriptions')
    .update({ status: preapproval.status, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) return { kind: 'error', message: error.message }
  return { kind: 'cancelled', status: preapproval.status }
}
