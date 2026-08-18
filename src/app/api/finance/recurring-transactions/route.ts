import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRecurringTransactionSchema } from '@/lib/validations/finance'

const SELECT = `
  id, wallet_id, category_id, type, amount, description,
  repeat_type, repeat_day, next_date, active, created_at, updated_at,
  wallet:wallets(id, name, color),
  category:finance_categories(id, name, color, icon)
`

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const onlyActive = req.nextUrl.searchParams.get('active') !== 'false'

  let query = supabase
    .from('recurring_transactions')
    .select(SELECT)
    .eq('user_id', user.id)
    .order('next_date', { ascending: true })

  if (onlyActive) query = query.eq('active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ recurring: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createRecurringTransactionSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const d = result.data
  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({
      user_id:     user.id,
      wallet_id:   d.wallet_id,
      category_id: d.category_id ?? null,
      type:        d.type,
      amount:      d.amount,
      description: d.description ?? null,
      repeat_type: d.repeat_type,
      repeat_day:  d.repeat_day ?? null,
      next_date:   d.next_date,
      active:      true,
    })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recurring: data }, { status: 201 })
}
