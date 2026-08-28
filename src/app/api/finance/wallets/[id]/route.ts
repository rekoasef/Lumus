import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateWalletSchema } from '@/lib/validations/finance'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = updateWalletSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  // Cambiar el tipo de billetera a "inversión" arranca el contador de
  // rendimiento: el saldo de hoy pasa a ser capital ya aportado. Los
  // movimientos anteriores no se pueden clasificar hacia atrás —solo el dueño
  // sabe cuál fue aporte y cuál ganancia— así que el histórico queda intacto y
  // la cuenta empieza en cero desde acá.
  const { data: current } = await supabase
    .from('wallets')
    .select('type, balance')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!current) return NextResponse.json({ error: 'Billetera no encontrada' }, { status: 404 })

  const newType = result.data.type ?? current.type
  const becameInvestment = newType === 'inversion' && current.type !== 'inversion'
  const leftInvestment   = newType !== 'inversion' && current.type === 'inversion'

  const investmentFields = becameInvestment
    ? {
        investment_baseline:      Number(current.balance),
        investment_baseline_date: new Date().toISOString().slice(0, 10),
      }
    : leftInvestment
      // Deja de ser inversión: se borra la base. Si vuelve a serlo, arranca de
      // nuevo desde el saldo de ese día, que es lo honesto.
      ? { investment_baseline: null, investment_baseline_date: null }
      : {}

  const { data, error } = await supabase
    .from('wallets')
    .update({ ...result.data, ...investmentFields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select('id, name, type, balance, currency, color, icon, investment_baseline, investment_baseline_date, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ wallet: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('wallets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
