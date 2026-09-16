import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateWalletSchema } from '@/lib/validations/finance'
import { effectiveInvestmentMode } from '@/lib/finance/feature-flags'

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

  // Cambiar a "inversión con saldo" arranca el contador de rendimiento: el saldo
  // de hoy pasa a ser capital ya aportado. Los movimientos anteriores no se
  // pueden clasificar hacia atrás —solo el dueño sabe cuál fue aporte y cuál
  // ganancia— así que el histórico queda intacto y la cuenta empieza en cero
  // desde acá.
  const { data: current } = await supabase
    .from('wallets')
    .select('type, balance, investment_mode, investment_baseline')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!current) return NextResponse.json({ error: 'Billetera no encontrada' }, { status: 404 })

  const newType = result.data.type ?? current.type
  const newMode = newType === 'inversion'
    ? effectiveInvestmentMode(result.data.investment_mode ?? current.investment_mode)
    : null

  // Una billetera con especies adentro no puede dejar de ser cartera: sus
  // acciones seguirían sumando al patrimonio desde una billetera que ya no las
  // muestra en ningún lado.
  if (current.investment_mode === 'tenencias' && newMode !== 'tenencias') {
    const { count } = await supabase
      .from('holdings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('wallet_id', id)
    if ((count ?? 0) > 0) {
      return NextResponse.json({
        error: 'Esta billetera tiene acciones o cripto adentro. Sacalas antes de cambiarle el tipo.',
      }, { status: 409 })
    }
  }

  // La base arranca al pasar a "saldo" desde cualquier otra cosa, cartera
  // incluida: una base vieja de antes de ser cartera contaría como rendimiento
  // todo lo que pasó en el medio.
  const startsBaseline = newMode === 'saldo'
    && (current.investment_baseline === null || current.investment_mode === 'tenencias')
  const investmentFields = startsBaseline
    ? {
        investment_baseline:      Number(current.balance),
        investment_baseline_date: new Date().toISOString().slice(0, 10),
      }
    : newType !== 'inversion'
      // Deja de ser inversión: se borra la base. Si vuelve a serlo, arranca de
      // nuevo desde el saldo de ese día, que es lo honesto.
      ? { investment_baseline: null, investment_baseline_date: null }
      : {}

  const { data, error } = await supabase
    .from('wallets')
    .update({ ...result.data, investment_mode: newMode, ...investmentFields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select('id, name, type, balance, currency, color, icon, investment_baseline, investment_baseline_date, investment_mode, created_at, updated_at')
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

  // Una billetera con un préstamo vivo no se puede esconder: el desembolso está
  // adentro y la deuda lo compensa desde afuera. Al sacar la billetera del
  // patrimonio, la plata se va y la deuda queda — el patrimonio pasa a estar
  // subestimado por todo el capital. Es la misma asimetría que el borrado de
  // préstamos y el del desembolso, entrando por la tercera puerta.
  const { data: linkedLoans } = await supabase
    .from('loans')
    .select('id, counterparty')
    .eq('user_id', user.id)
    .eq('wallet_id', id)
    .is('deleted_at', null)
    .limit(1)

  if (linkedLoans && linkedLoans.length > 0) {
    return NextResponse.json({
      error: `Esta billetera tiene un préstamo activo (${linkedLoans[0].counterparty}). Cerrá o eliminá el préstamo antes de borrarla.`,
    }, { status: 409 })
  }

  // Lo mismo con las acciones y cripto de una cartera: esconder la billetera las
  // dejaría sumando al patrimonio sin que ninguna pantalla las muestre.
  const { count: holdingsCount } = await supabase
    .from('holdings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('wallet_id', id)

  if ((holdingsCount ?? 0) > 0) {
    return NextResponse.json({
      error: 'Esta billetera tiene acciones o cripto adentro. Sacalas antes de borrarla.',
    }, { status: 409 })
  }

  const { error } = await supabase
    .from('wallets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
