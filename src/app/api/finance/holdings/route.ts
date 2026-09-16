import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPurchaseSchema } from '@/lib/validations/finance'
import { CRYPTO_OPTIONS, isCryptoId } from '@/lib/finance/crypto-prices'
import { HOLDING_SELECT, TRADE_SELECT, toHolding, toTrade } from '@/lib/finance/portfolio-data'
import { todayInArgentina } from '@/lib/notifications/due-notification'
import { PORTFOLIO_WALLETS_ENABLED } from '@/lib/finance/feature-flags'

// POST /api/finance/holdings — cargar una compra
//
// La especie se busca dentro de la billetera y se crea si no está: dos compras
// de GGAL son dos operaciones de la misma especie, no dos especies (`E2`).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Con las carteras escondidas nada puede entrar: una especie cargada ahora no
  // se vería en ninguna pantalla pero sí sumaría al patrimonio. Las rutas que
  // borran siguen abiertas a propósito, para poder limpiar.
  if (!PORTFOLIO_WALLETS_ENABLED) {
    return NextResponse.json({ error: 'Las carteras no están disponibles' }, { status: 404 })
  }

  const parsed = createPurchaseSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  const input = parsed.data

  // Una compra con fecha futura desordena el promedio y el costo en dólares
  // (no hay cotización de mañana). Se compara contra el día de Argentina.
  if (input.trade_date > todayInArgentina()) {
    return NextResponse.json({ error: 'La fecha de compra no puede ser futura' }, { status: 400 })
  }

  // La billetera tiene que ser del usuario y de inversión con tenencias: una
  // especie colgada de una billetera de saldo no se vería en ningún lado.
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, type, investment_mode')
    .eq('id', input.wallet_id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!wallet) return NextResponse.json({ error: 'Billetera no encontrada' }, { status: 404 })
  if (wallet.type !== 'inversion' || wallet.investment_mode !== 'tenencias') {
    return NextResponse.json({ error: 'Las acciones y cripto se cargan en una billetera de inversión con tenencias' }, { status: 400 })
  }

  // ── Qué especie es ──
  // Cripto: solo las de la lista, que existen en CoinGecko. Acción y CEDEAR:
  // el ticker en mayúsculas, que es como lo busca data912. Otro: sin fuente.
  let priceSource: string | null = null
  let name = input.name

  if (input.kind === 'cripto') {
    if (!input.price_source || !isCryptoId(input.price_source)) {
      return NextResponse.json({ error: 'Elegí una cripto de la lista' }, { status: 400 })
    }
    priceSource = input.price_source
    name = CRYPTO_OPTIONS.find(c => c.id === priceSource)?.label ?? name
  } else if (input.kind === 'accion' || input.kind === 'cedear') {
    if (!input.price_source) {
      return NextResponse.json({ error: 'Poné el ticker (por ejemplo GGAL o AAPL)' }, { status: 400 })
    }
    priceSource = input.price_source.toUpperCase()
    name = priceSource
  }

  let lookup = supabase
    .from('holdings')
    .select(HOLDING_SELECT)
    .eq('user_id', user.id)
    .eq('wallet_id', wallet.id)
    .eq('kind', input.kind)
  // Sin fuente, la especie es su nombre, sin distinguir mayúsculas (como el
  // índice único de 00033). Se escapan los comodines de `ilike`.
  lookup = priceSource
    ? lookup.eq('price_source', priceSource)
    : lookup.is('price_source', null).ilike('name', name.replace(/[\\%_]/g, '\\$&'))

  const { data: existing } = await lookup.maybeSingle()

  let holdingRow = existing
  let created = false

  if (!holdingRow) {
    const { data: inserted, error: insertError } = await supabase
      .from('holdings')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        kind: input.kind,
        name,
        price_source: priceSource,
        manual_price: input.manual_price ?? null,
      })
      .select(HOLDING_SELECT)
      .single()

    if (insertError || !inserted) {
      return NextResponse.json({ error: 'No se pudo guardar la especie' }, { status: 500 })
    }
    holdingRow = inserted
    created = true
  } else if (typeof input.manual_price === 'number') {
    // Cargar otra compra de algo con precio manual es un buen momento para
    // actualizarlo: es el precio que la persona tiene a mano ahora.
    await supabase
      .from('holdings')
      .update({ manual_price: input.manual_price, updated_at: new Date().toISOString() })
      .eq('id', holdingRow.id)
      .eq('user_id', user.id)
  }

  const { data: trade, error: tradeError } = await supabase
    .from('holding_trades')
    .insert({
      user_id: user.id,
      holding_id: holdingRow.id,
      side: 'compra',
      quantity: input.quantity,
      price: input.price,
      currency: input.currency,
      trade_date: input.trade_date,
    })
    .select(TRADE_SELECT)
    .single()

  if (tradeError || !trade) {
    // Una especie recién creada sin ninguna operación vale cero y ensucia la
    // pantalla: se deshace.
    if (created) await supabase.from('holdings').delete().eq('id', holdingRow.id).eq('user_id', user.id)
    return NextResponse.json({ error: 'No se pudo guardar la compra' }, { status: 500 })
  }

  return NextResponse.json({ holding: toHolding(holdingRow), trade: toTrade(trade), created }, { status: 201 })
}
