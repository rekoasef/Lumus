import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paySubscriptionSchema } from '@/lib/validations/finance'

function advanceNextBilling(current: string | null, cycle: string): string {
  const base = current ? new Date(current + 'T00:00:00') : new Date()
  if (cycle === 'mensual') {
    base.setMonth(base.getMonth() + 1)
  } else if (cycle === 'anual') {
    base.setFullYear(base.getFullYear() + 1)
  } else if (cycle === 'semanal') {
    base.setDate(base.getDate() + 7)
  }
  return base.toISOString().slice(0, 10)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = paySubscriptionSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  // Verificar que la suscripción pertenece al usuario
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('id, name, billing_cycle, next_billing, wallet_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (subError || !sub) {
    return NextResponse.json({ error: 'Vencimiento no encontrado' }, { status: 404 })
  }

  const walletId = result.data.wallet_id ?? sub.wallet_id
  if (!walletId) {
    return NextResponse.json({ error: 'Se necesita una billetera para registrar el pago' }, { status: 400 })
  }

  // Crear la transacción de gasto
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id:     user.id,
      wallet_id:   walletId,
      type:        'gasto',
      amount:      result.data.amount,
      category_id: result.data.category_id ?? null,
      description: sub.name,
      date:        result.data.date,
    })
    .select('id, amount, date')
    .single()

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

  // Avanzar next_billing al próximo ciclo
  const nextBilling = advanceNextBilling(sub.next_billing, sub.billing_cycle ?? 'mensual')

  const { data: updatedSub, error: updateError } = await supabase
    .from('subscriptions')
    .update({ next_billing: nextBilling, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, amount, currency, billing_cycle, next_billing, active, variable, icon, wallet_id, created_at, updated_at')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ subscription: updatedSub, transaction: tx }, { status: 201 })
}
