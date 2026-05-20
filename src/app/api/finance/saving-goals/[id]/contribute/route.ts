import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const contributeSchema = z.object({
  amount:    z.number().positive('El monto debe ser mayor a 0'),
  wallet_id: z.string().uuid().nullable().optional(),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = contributeSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  // Verificar que la meta pertenece al usuario
  const { data: goal, error: goalError } = await supabase
    .from('saving_goals')
    .select('id, name, current_amount, target_amount, wallet_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (goalError || !goal) {
    return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
  }

  const walletId = result.data.wallet_id ?? goal.wallet_id

  // Si hay billetera, crear transacción de gasto (el balance se actualiza por el trigger)
  if (walletId) {
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id:     user.id,
        wallet_id:   walletId,
        type:        'gasto',
        amount:      result.data.amount,
        description: `Ahorro: ${goal.name}`,
        date:        result.data.date,
      })

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  // Actualizar current_amount de la meta
  const newAmount = (goal.current_amount ?? 0) + result.data.amount
  const achieved  = newAmount >= goal.target_amount

  const { data: updatedGoal, error: updateError } = await supabase
    .from('saving_goals')
    .update({
      current_amount: newAmount,
      achieved:       achieved || undefined,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, target_amount, current_amount, target_date, achieved, icon, wallet_id, created_at, updated_at')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ goal: updatedGoal, wallet_used: !!walletId }, { status: 200 })
}
