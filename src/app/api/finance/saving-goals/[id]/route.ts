import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSavingGoalSchema } from '@/lib/validations/finance'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = updateSavingGoalSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { wallet_ids: walletIds, ...columns } = result.data

  const { data, error } = await supabase
    .from('saving_goals')
    .update({ ...columns, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, target_amount, current_amount, target_date, achieved, icon, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (walletIds !== undefined) {
    const { error: unlinkError } = await supabase
      .from('saving_goal_wallets')
      .delete()
      .eq('goal_id', id)

    if (unlinkError) return NextResponse.json({ error: unlinkError.message }, { status: 500 })

    if (walletIds.length > 0) {
      const { error: linkError } = await supabase
        .from('saving_goal_wallets')
        .insert(walletIds.map(wallet_id => ({ goal_id: id, wallet_id })))

      if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })
    }
  }

  const { data: currentLinks } = await supabase
    .from('saving_goal_wallets')
    .select('wallet_id')
    .eq('goal_id', id)

  return NextResponse.json({ goal: { ...data, wallet_ids: (currentLinks ?? []).map(l => l.wallet_id) } })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('saving_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
