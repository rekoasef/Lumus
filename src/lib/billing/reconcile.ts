import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { subscriptionUpdateFromMp } from './webhook-sync'

/**
 * Pone al día una suscripción `pending` preguntándole a Mercado Pago.
 *
 * El estado lo escribe el webhook, y el webhook puede no llegar: la URL quedó
 * mal configurada, MP falló, o el pago se hizo desde un entorno al que MP no
 * le puede pegar. Cuando eso pasa, el usuario paga, vuelve a Lumus y la
 * pantalla lo deja en "Esperando la confirmación del pago…" sin salida, con el
 * dinero ya cobrado. Esto es la red: antes de mostrarle nada, se le pregunta a
 * Mercado Pago cómo está la suscripción de verdad.
 *
 * Aplica el mismo cálculo que el webhook (`subscriptionUpdateFromMp`), así que
 * `paid_until` sigue avanzando solo con una suscripción autorizada.
 *
 * **Nunca tira.** Es una mejora de la lectura, no un paso obligatorio: si MP no
 * contesta, se sigue con lo que hay guardado.
 */

export interface SubscriptionRow {
  status: string
  paid_until: string | null
  updated_at: string | null
  mp_preapproval_id: string | null
}

const COLUMNS = 'status, paid_until, updated_at, mp_preapproval_id'

export async function reconcilePendingSubscription(
  service: SupabaseClient<Database>,
  userId: string,
): Promise<SubscriptionRow | null> {
  const { data: row } = await service
    .from('billing_subscriptions')
    .select(COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()

  // Solo las pendientes: una autorizada o cancelada ya la sincronizó el
  // webhook, y consultarlas todas sería una llamada a MP por visita.
  if (!row || row.status !== 'pending' || !row.mp_preapproval_id) return row ?? null

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${row.mp_preapproval_id}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
      // El estado de un pago no se cachea.
      cache: 'no-store',
    })

    if (!mpRes.ok) {
      console.warn('[billing] no se pudo consultar el preapproval en MP', mpRes.status)
      return row
    }

    const preapproval = await mpRes.json() as { id: string; status: string; next_payment_date?: string | null }
    if (preapproval.status === row.status) return row

    const { data: updated, error } = await service
      .from('billing_subscriptions')
      .update(subscriptionUpdateFromMp(preapproval, new Date()))
      .eq('user_id', userId)
      // Que no pise lo que el webhook haya escrito mientras tanto.
      .eq('status', 'pending')
      .select(COLUMNS)
      .maybeSingle()

    if (error) {
      console.warn('[billing] no se pudo guardar el estado de MP', error.message)
      return row
    }

    return updated ?? row
  } catch (err) {
    console.warn('[billing] falló la consulta a MP', err instanceof Error ? err.message : err)
    return row
  }
}
