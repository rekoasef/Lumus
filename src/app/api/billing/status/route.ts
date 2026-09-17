import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { reconcilePendingSubscription } from '@/lib/billing/reconcile'

/**
 * El estado de la suscripción, para el polling de `/suscripcion`.
 *
 * Mientras está pendiente se le pregunta a Mercado Pago en vez de leer solo la
 * fila: si el webhook se pierde, la fila nunca cambia y el usuario se queda
 * esperando una confirmación que ya pasó.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const subscription = await reconcilePendingSubscription(createServiceClient(), user.id)

  return NextResponse.json({ status: subscription?.status ?? null })
}
