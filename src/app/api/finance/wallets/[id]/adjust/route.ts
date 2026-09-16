import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adjustWalletSchema } from '@/lib/validations/finance'
import { splitBalanceChange, isNegligible, type InvestmentEvent } from '@/lib/finance/investment'

/** Las columnas de una billetera que la UI necesita. Nunca `*`. */
const WALLET_COLUMNS =
  'id, name, type, balance, currency, color, icon, investment_baseline, investment_baseline_date, investment_mode, created_at, updated_at'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = adjustWalletSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { new_balance, note, counterpart_wallet_id, movement_date } = result.data

  // Traer billetera actual
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('id, type, balance, currency, created_at, investment_baseline_date, investment_mode')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (walletError || !wallet) {
    return NextResponse.json({ error: 'Billetera no encontrada' }, { status: 404 })
  }

  // El movimiento solo significa algo en una inversión **con saldo**: en el
  // resto de las billeteras un cambio de saldo es siempre una corrección. En una
  // cartera de tenencias el saldo es el efectivo, y lo que rinde son las
  // especies, no ese número (`E2`).
  const isInvestment = wallet.type === 'inversion' && wallet.investment_mode !== 'tenencias'
  const movement = isInvestment ? (result.data.movement ?? 0) : 0

  const current_balance = Number(wallet.balance)
  const { yield: yieldAmount } = splitBalanceChange(current_balance, new_balance, movement)

  // Nada que registrar: ni se movió plata ni rindió.
  if (isNegligible(new_balance - current_balance) && isNegligible(movement)) {
    const { data: unchanged } = await supabase
      .from('wallets')
      .select(WALLET_COLUMNS)
      .eq('id', id)
      .single()
    return NextResponse.json({ wallet: unchanged, events: [] })
  }

  const today = new Date().toISOString().slice(0, 10)

  // La fecha del aporte puede ser pasada, pero no cualquiera: más adelante que
  // hoy no existe, y antes del arranque de la inversión el aporte quedaría
  // fuera del capital invertido —el cálculo ignora lo anterior a la base— y el
  // rendimiento saldría inflado sin que nada lo avise.
  const movementDate = movement_date ?? today

  if (!isNegligible(movement)) {
    if (movementDate > today) {
      return NextResponse.json(
        { error: 'La fecha del movimiento no puede ser futura' },
        { status: 400 },
      )
    }

    const baselineDate = wallet.investment_baseline_date
    if (baselineDate && movementDate < baselineDate) {
      return NextResponse.json(
        { error: `La inversión arranca el ${baselineDate}: un movimiento anterior no cuenta como capital` },
        { status: 400 },
      )
    }
  }

  // Calcular el balance que el trigger conoce (suma de transacciones).
  // Este `case` tiene que coincidir con el de `recompute_wallet_balance`
  // (migración 00028): si se desincronizan, la diferencia se materializa como
  // un "Balance inicial" que nadie cargó.
  const { data: txRows } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('wallet_id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  const tx_sum = (txRows ?? []).reduce<number>((sum, t) => {
    if (t.type === 'ingreso') return sum + Number(t.amount)
    if (t.type === 'gasto')   return sum - Number(t.amount)
    return sum + Number(t.amount)   // ajuste, transferencia y rendimiento van firmados
  }, 0)

  // Si hay balance implícito (saldo inicial no registrado como transacción),
  // lo materializamos para que el trigger lo tenga en cuenta
  const implicit = current_balance - tx_sum
  if (!isNegligible(implicit)) {
    await supabase.from('transactions').insert({
      user_id:         user.id,
      wallet_id:       id,
      type:            'ajuste',
      amount:          implicit,
      description:     'Balance inicial',
      date:            (wallet.created_at ?? today).slice(0, 10),
      category_id:     null,
      deleted_at:      null,
    })
  }

  // ── Billetera común: un ajuste y listo ──
  if (!isInvestment) {
    const description = note ? `Ajuste de balance: ${note}` : 'Ajuste de balance'

    const { error: txError } = await supabase.from('transactions').insert({
      user_id:     user.id,
      wallet_id:   id,
      type:        'ajuste',
      amount:      new_balance - current_balance,
      description,
      date:        today,
      category_id: null,
      deleted_at:  null,
    })

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

    const { data: updated, error: updError } = await supabase
      .from('wallets')
      .select(WALLET_COLUMNS)
      .eq('id', id)
      .single()

    if (updError) return NextResponse.json({ error: updError.message }, { status: 500 })

    return NextResponse.json({ wallet: updated, events: [] })
  }

  // ── Billetera de inversión: el cambio se parte en dos ──
  // La plata que entró o salió es una transferencia (no es rendimiento, es la
  // misma plata cambiando de lugar) y lo que sobra es lo que la inversión ganó
  // o perdió sola. Las dos cosas pueden pasar en la misma actualización.

  const counterpartId = counterpart_wallet_id ?? null

  if (counterpartId) {
    if (counterpartId === id) {
      return NextResponse.json(
        { error: 'La billetera de origen no puede ser la misma' },
        { status: 400 },
      )
    }

    const { data: counterpart } = await supabase
      .from('wallets')
      .select('id')
      .eq('id', counterpartId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (!counterpart) {
      return NextResponse.json({ error: 'Billetera de origen no encontrada' }, { status: 400 })
    }
  }

  const rows: {
    user_id: string
    wallet_id: string
    category_id: null
    type: string
    amount: number
    description: string | null
    date: string
    deleted_at: null
  }[] = []

  // Los dos eventos que puede generar una actualización. Vuelven en la
  // respuesta para que el rendimiento y su historial se actualicen en la
  // pantalla sin recargar.
  const createdEvents: InvestmentEvent[] = []

  if (!isNegligible(movement)) {
    const label = movement > 0 ? 'Aporte a la inversión' : 'Retiro de la inversión'
    const description = note ? `${label}: ${note}` : label

    // La pata de la inversión, firmada: + entra, − sale.
    rows.push({
      user_id: user.id, wallet_id: id, category_id: null,
      type: 'transferencia', amount: movement, description, date: movementDate, deleted_at: null,
    })

    // La pata de la otra billetera, al revés. Sin contraparte el aporte vino de
    // afuera de la app (un sueldo depositado directo, por ejemplo) y queda una
    // sola pata: sigue sin ser un ingreso, así que no ensucia los reportes.
    if (counterpartId) {
      rows.push({
        user_id: user.id, wallet_id: counterpartId, category_id: null,
        type: 'transferencia', amount: -movement, description, date: movementDate, deleted_at: null,
      })
    }

    createdEvents.push({ date: movementDate, amount: movement, kind: 'movimiento' })
  }

  if (!isNegligible(yieldAmount)) {
    createdEvents.push({ date: today, amount: yieldAmount, kind: 'rendimiento' })
    const label = yieldAmount > 0 ? 'Rendimiento' : 'Pérdida de la inversión'
    rows.push({
      user_id: user.id, wallet_id: id, category_id: null,
      type: 'rendimiento', amount: yieldAmount,
      description: note ? `${label}: ${note}` : label,
      date: today, deleted_at: null,
    })
  }

  if (rows.length > 0) {
    const { error: txError } = await supabase.from('transactions').insert(rows)
    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  const hasMovement = createdEvents.some(e => e.kind === 'movimiento')
  const walletIds = counterpartId && hasMovement ? [id, counterpartId] : [id]

  const { data: wallets, error: updError } = await supabase
    .from('wallets')
    .select(WALLET_COLUMNS)
    .in('id', walletIds)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (updError) return NextResponse.json({ error: updError.message }, { status: 500 })

  const updated = (wallets ?? []).find(w => w.id === id)

  return NextResponse.json({
    wallet: updated,
    wallets: wallets ?? [],
    events: createdEvents,
  })
}
