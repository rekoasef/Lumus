import { NextRequest, NextResponse } from 'next/server'
import Anthropic, { APIError } from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { MAX_REPORT_REGENERATIONS, regenerationState } from '@/lib/finance/report-limits'
import { convertToARS, getExchangeRates } from '@/lib/finance/exchange-rates'
import { getCryptoPrices } from '@/lib/finance/crypto-prices'
import { portfolioTotals, resolvePriceUsd, valuateHolding, type Holding } from '@/lib/finance/holdings'
import { rateOn } from '@/lib/finance/purchasing-power'
import { fetchRateHistory, yearsAgo } from '@/lib/finance/rate-history'
import { monthsOfRunway, pesoLossOverWindows, wealthComposition } from '@/lib/finance/wealth'
import { savingGoalProgress } from '@/lib/finance/rules'
import { formatCurrency } from '@/lib/utils/format-currency'
import { todayInArgentina } from '@/lib/notifications/due-notification'
import { WEALTH_SYSTEM_PROMPT } from '@/lib/finance/wealth-prompt'

const bodySchema = z.object({
  regenerate: z.boolean().optional().default(false),
})


interface WealthSnapshot {
  prompt: string
  hasData: boolean
}

async function buildWealthContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<WealthSnapshot> {
  const today = todayInArgentina()

  const [walletsRes, holdingsRes, rateHistory, rates, goalsRes] = await Promise.all([
    supabase.from('wallets').select('id, type, balance, currency').eq('user_id', userId).is('deleted_at', null),
    supabase
      .from('holdings')
      .select('id, name, kind, price_source, quantity, purchase_price, purchase_currency, purchase_date, manual_price')
      .eq('user_id', userId),
    // Dos años alcanzan para las ventanas que se comparan acá.
    fetchRateHistory(supabase, yearsAgo(2)),
    getExchangeRates(),
    supabase
      .from('saving_goals')
      .select('name, target_amount, current_amount, achieved, saving_goal_wallets(wallet_id)')
      .eq('user_id', userId),
  ])

  const wallets = walletsRes.data ?? []
  const holdings = (holdingsRes.data ?? []) as unknown as Holding[]

  // ── Patrimonio ──
  const arsArs = wallets
    .filter(w => (w.currency ?? 'ARS') === 'ARS')
    .reduce((sum, w) => sum + Number(w.balance ?? 0), 0)

  const foreignArs = wallets
    .filter(w => (w.currency ?? 'ARS') !== 'ARS')
    .reduce((sum, w) => sum + convertToARS(Number(w.balance ?? 0), w.currency ?? 'ARS', rates), 0)

  const cryptoPrices = await getCryptoPrices(
    holdings.map(h => h.price_source).filter((id): id is string => Boolean(id)),
  )
  const portfolio = portfolioTotals(holdings.map(holding => {
    const price = resolvePriceUsd(holding, cryptoPrices)
    return price === null ? null : valuateHolding(holding, price, rates.USD, rateHistory)
  }))

  const composition = wealthComposition(arsArs, foreignArs, portfolio.valueArs)

  // ── Gasto mensual promedio de los últimos 3 meses ──
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const { data: expenses } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'gasto')
    .is('deleted_at', null)
    .gte('date', threeMonthsAgo.toISOString().slice(0, 10))

  const monthlyExpenses = (expenses ?? []).reduce((sum, t) => sum + Number(t.amount), 0) / 3

  // Las billeteras de inversión suman al patrimonio pero no al colchón: son
  // plata que hay que sacar de algún lado antes de poder usarla. Contarlas acá
  // daría meses de respaldo que no existen el día que hace falta la plata.
  const investmentArs = wallets
    .filter(w => w.type === 'inversion')
    .reduce((sum, w) => sum + convertToARS(Number(w.balance ?? 0), w.currency ?? 'ARS', rates), 0)

  const runway = monthsOfRunway(arsArs + foreignArs - investmentArs, monthlyExpenses)

  // ── Qué le pasó al peso ──
  const rateNow = rateOn(rateHistory, today) ?? rates.USD
  const windowFor = (days: number) => {
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - days)
    return rateOn(rateHistory, d.toISOString().slice(0, 10))
  }

  const losses = pesoLossOverWindows(rateNow, [
    { label: 'los últimos 30 días', rateThen: windowFor(30) },
    { label: 'los últimos 6 meses', rateThen: windowFor(182) },
    { label: 'el último año', rateThen: windowFor(365) },
  ])

  // El progreso de una meta **no** es `current_amount`: si tiene billeteras
  // vinculadas, es la suma de sus saldos convertidos a ARS. Leer el campo crudo
  // es el bug que `C3` vino a eliminar — una meta con plata real informada como
  // $0 — y se coló de nuevo acá hasta que el usuario lo vio en su análisis.
  // Por eso la regla vive en `lib/finance/rules.ts` y no se recalcula a mano.
  const toARS = (amount: number, currency: string) => convertToARS(amount, currency, rates)

  const goals = (goalsRes.data ?? [])
    .filter(g => !g.achieved)
    .map(goal => {
      const walletIds = (goal.saving_goal_wallets ?? []).map(w => w.wallet_id)
      const linked = wallets
        .filter(w => walletIds.includes(w.id))
        .map(w => ({ balance: Number(w.balance ?? 0), currency: w.currency ?? 'ARS' }))

      const progress = savingGoalProgress(
        { target_amount: Number(goal.target_amount), current_amount: Number(goal.current_amount ?? 0) },
        linked,
        toARS,
      )

      return { name: goal.name, target: Number(goal.target_amount), progress, linkedCount: linked.length }
    })

  const money = (n: number) => formatCurrency(n, 'ARS', 'rounded')

  const prompt = `PATRIMONIO DE HOY (${today})

Total: ${money(composition.totalArs)} (US$ ${rateNow > 0 ? Math.round(composition.totalArs / rateNow).toLocaleString('es-AR') : '—'})
  - En pesos: ${money(composition.arsArs)} — ${composition.pesoExposurePercent.toFixed(0)}% del total
  - En moneda extranjera: ${money(composition.foreignArs)}
  - Invertido: ${money(composition.holdingsArs)}${portfolio.unpriced > 0 ? ` (${portfolio.unpriced} tenencia(s) sin precio, no incluidas)` : ''}

${holdings.length > 0
  ? `INVERSIONES\n${holdings.map(h => `  - ${h.name}: ${h.quantity} unidades`).join('\n')}${portfolio.costUsd > 0 ? `\n  Rendimiento de la cartera: ${portfolio.returnPercent >= 0 ? '+' : ''}${portfolio.returnPercent.toFixed(1)}% en dólares, medido contra lo que se pagó` : ''}`
  : 'INVERSIONES\n  - No hay ninguna cargada.'}

GASTO Y RESERVA
  Gasto promedio de los últimos 3 meses: ${money(monthlyExpenses)} por mes
  ${runway !== null ? `La plata líquida cubre ${runway.toFixed(1)} meses de ese gasto.` : 'No hay suficientes gastos cargados para calcular cuántos meses cubre.'}

QUÉ HIZO EL PESO CONTRA EL DÓLAR
  Dólar blue hoy: ${money(rateNow)}
${losses.length > 0
  ? losses.map(l => `  - En ${l.label}: los pesos ${l.percent < 0 ? 'perdieron' : 'ganaron'} ${Math.abs(l.percent).toFixed(1)}% de su valor en dólares`).join('\n')
  : '  - No hay cotizaciones suficientes para comparar.'}

${goals.length > 0
  ? `METAS DE AHORRO ABIERTAS\n${goals.map(g => `  - ${g.name}: ${money(g.progress.currentAmount)} de ${money(g.target)} (${g.progress.percent}%)${g.linkedCount > 0 ? ` — el avance sale del saldo de ${g.linkedCount} billetera(s) vinculada(s)` : ''}`).join('\n')}`
  : 'METAS DE AHORRO\n  - No hay metas abiertas.'}

Analizá esta situación.`

  return { prompt, hasData: composition.totalArs > 0 }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const month = todayInArgentina().slice(0, 7)

  const { data: existing } = await supabase
    .from('wealth_analyses')
    .select('id, user_id, month, content, regenerations, created_at')
    .eq('user_id', user.id)
    .eq('month', month)
    .maybeSingle()

  if (existing && !parsed.data.regenerate) {
    return NextResponse.json({ analysis: existing })
  }

  // El tope se chequea antes de armar el contexto: es otra llamada paga.
  if (existing && !regenerationState(existing.regenerations).canRegenerate) {
    return NextResponse.json(
      {
        error: MAX_REPORT_REGENERATIONS === 1
          ? 'Este análisis ya se rehizo una vez. Se puede rehacer una vez por mes.'
          : `Este análisis ya se rehizo ${MAX_REPORT_REGENERATIONS} veces.`,
        analysis: existing,
      },
      { status: 409 },
    )
  }

  const { prompt, hasData } = await buildWealthContext(supabase, user.id)

  if (!hasData) {
    return NextResponse.json(
      { error: 'Todavía no hay patrimonio cargado para analizar. Sumá una billetera o una inversión.' },
      { status: 400 },
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('wealth-analysis: falta ANTHROPIC_API_KEY')
    return NextResponse.json({ error: 'El servicio de IA no está disponible en este momento.' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let response
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1200,
      // Sin thinking: en Sonnet 5 omitirlo lo prende, y los tokens de
      // razonamiento salen del mismo `max_tokens`.
      thinking: { type: 'disabled' },
      system: WEALTH_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('wealth-analysis: falló Anthropic', err instanceof APIError ? err.message : err)
    return NextResponse.json({ error: 'No se pudo generar el análisis. Probá de nuevo en unos minutos.' }, { status: 502 })
  }

  const content = response.content[0]?.type === 'text' ? response.content[0].text : ''
  if (!content) {
    console.error('wealth-analysis: respuesta sin contenido de texto')
    return NextResponse.json({ error: 'La IA no devolvió un análisis válido.' }, { status: 502 })
  }

  const saveQuery = existing
    ? supabase
        .from('wealth_analyses')
        .update({
          content,
          created_at: new Date().toISOString(),
          regenerations: existing.regenerations + 1,
        })
        .eq('id', existing.id)
    : supabase
        .from('wealth_analyses')
        .insert({ user_id: user.id, month, content })

  const { data: saved, error: saveError } = await saveQuery
    .select('id, user_id, month, content, regenerations, created_at')
    .single()

  if (saveError || !saved) {
    return NextResponse.json({ error: 'Error al guardar el análisis' }, { status: 500 })
  }

  return NextResponse.json({ analysis: saved })
}
