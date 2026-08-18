import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  SUBSCRIPTION_PRICE_ARS,
  SUBSCRIPTION_CURRENCY,
  SUBSCRIPTION_REASON,
  SUBSCRIPTION_FREQUENCY_MONTHS,
} from '@/lib/billing/plan'

interface MpPreapprovalResponse {
  id: string
  init_point: string
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: existing } = await supabase
    .from('billing_subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.status === 'authorized') {
    return NextResponse.json({ error: 'Ya tenés una suscripción activa' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, '')

  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: SUBSCRIPTION_REASON,
      external_reference: user.id,
      payer_email: user.email,
      back_url: `${appUrl}/suscripcion`,
      auto_recurring: {
        frequency: SUBSCRIPTION_FREQUENCY_MONTHS,
        frequency_type: 'months',
        transaction_amount: SUBSCRIPTION_PRICE_ARS,
        currency_id: SUBSCRIPTION_CURRENCY,
      },
    }),
  })

  if (!mpRes.ok) {
    const errorBody = await mpRes.text()
    return NextResponse.json({ error: `Mercado Pago: ${errorBody}` }, { status: 502 })
  }

  const preapproval = await mpRes.json() as MpPreapprovalResponse

  // service_role: el usuario puede reintentar el checkout aunque su fila
  // esté 'cancelled'/'paused' (ya validamos arriba que no esté 'authorized').
  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('billing_subscriptions')
    .upsert({
      user_id: user.id,
      mp_preapproval_id: preapproval.id,
      status: 'pending',
      amount: SUBSCRIPTION_PRICE_ARS,
      currency: SUBSCRIPTION_CURRENCY,
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ init_point: preapproval.init_point })
}
