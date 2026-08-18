import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSavingGoalSchema } from '@/lib/validations/finance'

const SELECT_WITH_WALLETS = 'id, name, target_amount, current_amount, target_date, achieved, icon, created_at, updated_at, saving_goal_wallets(wallet_id)'

interface GoalRow {
  id: string
  name: string
  target_amount: number
  current_amount: number | null
  target_date: string | null
  achieved: boolean | null
  icon: string | null
  created_at: string | null
  updated_at: string | null
  saving_goal_wallets: { wallet_id: string }[]
}

function withWalletIds(row: GoalRow) {
  const { saving_goal_wallets, ...goal } = row
  return { ...goal, wallet_ids: saving_goal_wallets.map(w => w.wallet_id) }
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('saving_goals')
    .select(SELECT_WITH_WALLETS)
    .eq('user_id', user.id)
    .order('achieved', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ goals: (data ?? []).map(withWalletIds) })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createSavingGoalSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('saving_goals')
    .insert({
      user_id:       user.id,
      name:          result.data.name,
      target_amount: result.data.target_amount,
      target_date:   result.data.target_date ?? null,
      icon:          result.data.icon ?? null,
    })
    .select('id, name, target_amount, current_amount, target_date, achieved, icon, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const walletIds = result.data.wallet_ids ?? []
  if (walletIds.length > 0) {
    const { error: linkError } = await supabase
      .from('saving_goal_wallets')
      .insert(walletIds.map(wallet_id => ({ goal_id: data.id, wallet_id })))

    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  return NextResponse.json({ goal: { ...data, wallet_ids: walletIds } }, { status: 201 })
}
