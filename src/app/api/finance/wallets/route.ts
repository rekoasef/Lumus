import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createWalletSchema } from '@/lib/validations/finance'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('wallets')
    .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ wallets: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createWalletSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const initialBalance = result.data.balance

  const { data, error } = await supabase
    .from('wallets')
    .insert({
      user_id: user.id,
      name: result.data.name,
      type: result.data.type,
      balance: 0,
      currency: result.data.currency,
      color: result.data.color,
      icon: result.data.icon ?? null,
      deleted_at: null,
    })
    .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed categorías default si es la primera billetera del usuario
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('seed_default_finance_categories', { p_user_id: user.id })

  if (Math.abs(initialBalance) > 0.01) {
    const { error: txError } = await supabase.from('transactions').insert({
      user_id:         user.id,
      wallet_id:       data.id,
      type:            'ajuste',
      amount:          initialBalance,
      description:     'Balance inicial',
      date:            new Date().toISOString().slice(0, 10),
      category_id:     null,
      auto_classified: false,
      deleted_at:      null,
    })

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

    const { data: updated, error: updatedError } = await supabase
      .from('wallets')
      .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
      .eq('id', data.id)
      .single()

    if (updatedError) return NextResponse.json({ error: updatedError.message }, { status: 500 })

    return NextResponse.json({ wallet: updated }, { status: 201 })
  }

  return NextResponse.json({ wallet: data }, { status: 201 })
}
