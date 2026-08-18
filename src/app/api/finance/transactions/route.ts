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
      id, wallet_id, category_id, type, amount, description, date, created_at, updated_at,
      wallet:wallets(id, name, color, currency),
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

  const d = result.data
  const isTransfer = d.type === 'transferencia' && d.to_wallet_id

  if (isTransfer) {
    // Verificar que la billetera destino pertenece al usuario
    const { data: destWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('id', d.to_wallet_id!)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (!destWallet) {
      return NextResponse.json({ error: 'Billetera destino no encontrada' }, { status: 400 })
    }

    const desc = d.description?.trim() || null

    // Insertar las dos transacciones en paralelo
    const [egreso, ingreso] = await Promise.all([
      supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: d.wallet_id,
          category_id: null,
          type: 'transferencia',
          amount: d.amount,
          description: desc,
          date: d.date,
          deleted_at: null,
        })
        .select(`id, wallet_id, category_id, type, amount, description, date, created_at, updated_at, wallet:wallets(id, name, color, currency), category:finance_categories(id, name, color, icon)`)
        .single(),
      supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: d.to_wallet_id!,
          category_id: null,
          type: 'transferencia',
          amount: d.amount,
          description: desc,
          date: d.date,
          deleted_at: null,
        })
        .select(`id, wallet_id, category_id, type, amount, description, date, created_at, updated_at, wallet:wallets(id, name, color, currency), category:finance_categories(id, name, color, icon)`)
        .single(),
    ])

    if (egreso.error) return NextResponse.json({ error: egreso.error.message }, { status: 500 })
    if (ingreso.error) return NextResponse.json({ error: ingreso.error.message }, { status: 500 })

    // Recomputar balances de ambas billeteras
    await Promise.all([
      supabase.rpc('recompute_wallet_balance', { p_wallet_id: d.wallet_id }),
      supabase.rpc('recompute_wallet_balance', { p_wallet_id: d.to_wallet_id! }),
    ])

    const { data: wallets } = await supabase
      .from('wallets')
      .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
      .in('id', [d.wallet_id, d.to_wallet_id!])
      .eq('user_id', user.id)
      .is('deleted_at', null)

    return NextResponse.json(
      { transaction: egreso.data, extraTransaction: ingreso.data, wallets: wallets ?? [] },
      { status: 201 },
    )
  }

  // Gasto / ingreso normales
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      wallet_id: d.wallet_id,
      category_id: d.category_id ?? null,
      type: d.type,
      amount: d.amount,
      description: d.description ?? null,
      date: d.date,
      deleted_at: null,
    })
    .select(`
      id, wallet_id, category_id, type, amount, description, date, created_at, updated_at,
      wallet:wallets(id, name, color, currency),
      category:finance_categories(id, name, color, icon)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.rpc('recompute_wallet_balance', { p_wallet_id: d.wallet_id })

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
    .eq('id', d.wallet_id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  return NextResponse.json({ transaction: data, wallet }, { status: 201 })
}
