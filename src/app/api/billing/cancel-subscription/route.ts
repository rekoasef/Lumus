import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { cancelSubscriptionFor } from '@/lib/billing/cancel'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // service_role: la tabla solo la lee el usuario, no la escribe (00035).
  const result = await cancelSubscriptionFor(createServiceClient(), user.id)

  switch (result.kind) {
    case 'cancelled':
      return NextResponse.json({ status: result.status })
    case 'nothing_to_cancel':
      return NextResponse.json({ error: 'No tenés una suscripción activa para cancelar' }, { status: 400 })
    case 'error':
      return NextResponse.json({ error: result.message }, { status: 502 })
  }
}
