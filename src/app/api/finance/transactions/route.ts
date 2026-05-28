import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransactionSchema } from '@/lib/validations/finance'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')
  const category_id = searchParams.get('category_id')
  const wallet_id = searchParams.get('wallet_id')
  const date_from = searchParams.get('date_from')
  const date_to = searchParams.get('date_to')
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)

  let query = supabase
    .from('transactions')
    .select(`
      id, wallet_id, category_id, type, amount, description, date, auto_classified, created_at, updated_at,
      wallet:wallets(id, name, color),
      category:finance_categories(id, name, color, icon)
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type === 'gasto' || type === 'ingreso' || type === 'transferencia' || type === 'ajuste') {
    query = query.eq('type', type)
  }
  if (category_id) query = query.eq('category_id', category_id)
  if (wallet_id) query = query.eq('wallet_id', wallet_id)
  if (date_from) query = query.gte('date', date_from)
  if (date_to) query = query.lte('date', date_to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ transactions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createTransactionSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      wallet_id: result.data.wallet_id,
      category_id: result.data.category_id ?? null,
      type: result.data.type,
      amount: result.data.amount,
      description: result.data.description ?? null,
      date: result.data.date,
      auto_classified: body.auto_classified === true,
      deleted_at: null,
    })
    .select(`
      id, wallet_id, category_id, type, amount, description, date, auto_classified, created_at, updated_at,
      wallet:wallets(id, name, color),
      category:finance_categories(id, name, color, icon)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Actualizar balance de la billetera explícitamente (safety net además del trigger)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('recompute_wallet_balance', { p_wallet_id: result.data.wallet_id })

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
    .eq('id', result.data.wallet_id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  return NextResponse.json({ transaction: data, wallet }, { status: 201 })
}
