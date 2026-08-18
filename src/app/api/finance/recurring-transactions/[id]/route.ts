import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateRecurringTransactionSchema } from '@/lib/validations/finance'
import { createTransactionSchema } from '@/lib/validations/finance'

const SELECT = `
  id, wallet_id, category_id, type, amount, description,
  repeat_type, repeat_day, next_date, active, created_at, updated_at,
  wallet:wallets(id, name, color),
  category:finance_categories(id, name, color, icon)
`

function nextOccurrence(repeatType: string, repeatDay: number | null, fromDate: string): string {
  const d = new Date(fromDate + 'T12:00:00')
  if (repeatType === 'daily') {
    d.setDate(d.getDate() + 1)
  } else if (repeatType === 'weekly') {
    d.setDate(d.getDate() + 7)
  } else if (repeatType === 'monthly') {
    d.setMonth(d.getMonth() + 1)
    if (repeatDay) d.setDate(Math.min(repeatDay, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  }
  return d.toISOString().slice(0, 10)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = updateRecurringTransactionSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('recurring_transactions')
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recurring: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// POST /api/finance/recurring-transactions/[id]/apply — registrar la transacción ahora y avanzar next_date
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()

  const { data: rec, error: recErr } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (recErr || !rec) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const txDate = body.date ?? rec.next_date

  const txInput = createTransactionSchema.safeParse({
    wallet_id:   rec.wallet_id,
    category_id: rec.category_id,
    type:        rec.type,
    amount:      rec.amount,
    description: rec.description,
    date:        txDate,
  })
  if (!txInput.success) return NextResponse.json({ error: txInput.error.flatten() }, { status: 400 })

  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .insert({
      user_id:        user.id,
      wallet_id:      rec.wallet_id,
      category_id:    rec.category_id ?? null,
      type:           rec.type,
      amount:         rec.amount,
      description:    rec.description ?? null,
      date:           txDate,
      deleted_at:     null,
    })
    .select(`id, wallet_id, category_id, type, amount, description, date, created_at, updated_at, wallet:wallets(id, name, color), category:finance_categories(id, name, color, icon)`)
    .single()

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

  await supabase.rpc('recompute_wallet_balance', { p_wallet_id: rec.wallet_id })

  // Avanzar next_date
  const newNext = nextOccurrence(rec.repeat_type, rec.repeat_day, rec.next_date)
  await supabase
    .from('recurring_transactions')
    .update({ next_date: newNext, updated_at: new Date().toISOString() })
    .eq('id', id)

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
    .eq('id', rec.wallet_id)
    .single()

  return NextResponse.json({ transaction: tx, wallet, newNextDate: newNext }, { status: 201 })
}
