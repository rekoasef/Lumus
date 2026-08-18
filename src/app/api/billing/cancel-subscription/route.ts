import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

interface MpPreapprovalResponse {
  id: string
  status: string
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('status, mp_preapproval_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!subscription || subscription.status !== 'authorized') {
    return NextResponse.json({ error: 'No tenés una suscripción activa para cancelar' }, { status: 400 })
  }

  if (!subscription.mp_preapproval_id) {
    return NextResponse.json({ error: 'Esta cuenta no tiene una suscripción real de Mercado Pago' }, { status: 400 })
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
    const errorBody = await mpRes.text()
    return NextResponse.json({ error: `Mercado Pago: ${errorBody}` }, { status: 502 })
  }

  const preapproval = await mpRes.json() as MpPreapprovalResponse

  // service_role: la policy de RLS solo deja al usuario crear/leer su fila
  // en estado pending, no actualizar el status directamente.
  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('billing_subscriptions')
    .update({ status: preapproval.status, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ status: preapproval.status })
}
