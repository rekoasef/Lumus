import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ status: subscription?.status ?? null })
}
