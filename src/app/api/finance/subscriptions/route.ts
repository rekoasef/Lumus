import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSubscriptionSchema } from '@/lib/validations/finance'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, name, amount, currency, billing_cycle, next_billing, active, icon, wallet_id, created_at, updated_at')
    .eq('user_id', user.id)
    .order('active', { ascending: false })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ subscriptions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createSubscriptionSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id:       user.id,
      name:          result.data.name,
      amount:        result.data.amount,
      currency:      result.data.currency,
      billing_cycle: result.data.billing_cycle,
      wallet_id:     result.data.wallet_id ?? null,
      next_billing:  result.data.next_billing ?? null,
      icon:          result.data.icon ?? null,
    })
    .select('id, name, amount, currency, billing_cycle, next_billing, active, icon, wallet_id, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ subscription: data }, { status: 201 })
}
