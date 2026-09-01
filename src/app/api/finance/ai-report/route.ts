import { NextRequest, NextResponse } from 'next/server'
import Anthropic, { APIError } from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { MAX_REPORT_REGENERATIONS, regenerationState } from '@/lib/finance/report-limits'
import { convertToARS, getExchangeRates } from '@/lib/finance/exchange-rates'
import { budgetUsage, monthlyRecurringAmount, savingGoalProgress, savingsRate } from '@/lib/finance/rules'
import { rawTotalsByCategory, sumSummary, totalsByCategory } from '@/lib/finance/summary'
import { formatCurrency } from '@/lib/utils/format-currency'
import type { FinanceSummaryRow, RecurringRepeatType } from '@/types/finance.types'

const bodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM requerido'),
  regenerate: z.boolean().optional().default(false),
})

/** Todo lo que llega al prompt ya está en pesos y sin centavos. */
const money = (amount: number) => formatCurrency(amount, 'ARS', 'rounded')

async function buildMonthContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  month: string,
): Promise<string> {
  const [y, m] = month.split('-').map(Number)
  const monthStart = `${month}-01`
  // Inclusivo: `get_finance_summary` filtra con `date <= p_to`, no con `<`.
  // El último día sale en UTC para que no dependa del huso del servidor.
  const monthEnd = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`

  const monthLabel = new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  const [summaryRes, categoriesRes, budgetsRes, recurrentesRes, goalsRes, walletsRes, rates] = await Promise.all([
    // Los totales salen del mismo agregado que las pantallas de finanzas, y no
    // de sumar `transactions.amount` a mano. Ese era el bug: una transacción no
    // tiene moneda propia, la hereda de su billetera, así que sumar los montos
    // crudos contaba un ingreso de USD 750 como $750. El agregado viene
    // separado por moneda y la conversión pasa acá.
    supabase.rpc('get_finance_summary', { p_from: monthStart, p_to: monthEnd }),
    // Sin filtrar `deleted_at`: un gasto de una categoría ya borrada tiene que
    // seguir apareciendo con su nombre en el informe del mes en que se hizo.
    supabase
      .from('finance_categories')
      .select('id, name')
      .eq('user_id', userId),
    supabase
      .from('budgets')
      .select('amount, category_id, category:finance_categories(name)')
      .eq('user_id', userId)
      .eq('month', m)
      .eq('year', y),
    supabase
      .from('recurring_transactions')
      .select('description, amount, type, repeat_type, next_date, wallet:wallets(currency)')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('saving_goals')
      .select('name, target_amount, current_amount, achieved, saving_goal_wallets(wallet_id)')
      .eq('user_id', userId),
    supabase
      .from('wallets')
      .select('id, name, balance, currency')
      .eq('user_id', userId)
      .is('deleted_at', null),
    getExchangeRates(),
  ])

  const toARS = (amount: number, currency: string) => convertToARS(amount, currency, rates)

  const summary = (summaryRes.data ?? []) as unknown as FinanceSummaryRow[]
  const wallets = walletsRes.data ?? []
  const categoryNames = new Map((categoriesRes.data ?? []).map(c => [c.id, c.name]))

  const totalGastos = sumSummary(summary, 'gasto', toARS)
  const totalIngresos = sumSummary(summary, 'ingreso', toARS)
  const rate = savingsRate(totalIngresos, totalGastos)

  // Gastos agrupados por categoría, ya convertidos
  const categoriaLines = totalsByCategory(summary, 'gasto', toARS)
    .map(row => `  - ${categoryNames.get(row.categoryId ?? '') ?? 'Sin categoría'}: ${money(row.total)}`)
    .join('\n') || '  - Sin gastos registrados'

  // Presupuestos. Se comparan contra el gasto SIN convertir porque un
  // presupuesto se define en pesos y contra pesos se mide — mismo criterio que
  // la pantalla de finanzas, para que los dos números coincidan.
  type BudgetRow = { amount: number; category_id: string | null; category: { name: string } | null }
  const spentByCategory = rawTotalsByCategory(summary, 'gasto')
  const budgets = (budgetsRes.data ?? []) as unknown as BudgetRow[]
  const budgetLines = budgets.length > 0
    ? budgets
        .map(b => {
          const usage = budgetUsage({ amount: Number(b.amount), spent: spentByCategory[b.category_id ?? ''] ?? 0 })
          return `  - ${b.category?.name ?? 'Sin categoría'}: gastado ${money(usage.spent)} de ${money(usage.limit)} (${usage.percent}%). ${usage.overspent ? `Se pasó por ${money(usage.overspentBy)}` : `Disponible: ${money(usage.remaining)}`}`
        })
        .join('\n')
    : '  - Sin presupuestos definidos'

  // Fijos y recurrentes — costo mensual, en pesos
  type RecurringRow = {
    description: string | null
    amount: number
    type: string
    repeat_type: RecurringRepeatType
    next_date: string
    wallet: { currency: string | null } | { currency: string | null }[] | null
  }
  const recurrentes = (recurrentesRes.data ?? []) as unknown as RecurringRow[]
  const recurringCurrency = (r: RecurringRow) => {
    const wallet = Array.isArray(r.wallet) ? r.wallet[0] : r.wallet
    return wallet?.currency ?? 'ARS'
  }
  const totalFixed = recurrentes.reduce((sum, rec) => {
    if (rec.type !== 'gasto') return sum
    return sum + toARS(monthlyRecurringAmount(Number(rec.amount), rec.repeat_type), recurringCurrency(rec))
  }, 0)
  const recurringLines = recurrentes
    .map(r => {
      const currency = recurringCurrency(r)
      const native = formatCurrency(Number(r.amount), currency, 'byCurrency')
      const equivalent = currency === 'ARS' ? '' : ` (${money(toARS(Number(r.amount), currency))})`
      return `  - ${r.description ?? (r.type === 'gasto' ? 'Gasto fijo' : 'Ingreso fijo')} (${r.type}, ${r.repeat_type}): ${native}${equivalent} · próxima fecha ${r.next_date}`
    })
    .join('\n') || '  - Sin fijos/recurrentes'

  // Metas de ahorro. El vínculo con las billeteras vive en `saving_goal_wallets`
  // desde que una meta puede tener más de una: leer un `saving_goals.wallet_id`
  // que ya no existe hacía fallar la consulta entera y el informe salía diciendo
  // "no tenés metas configuradas" con las metas cargadas.
  type GoalRow = {
    name: string
    target_amount: number
    current_amount: number | null
    achieved: boolean | null
    saving_goal_wallets: { wallet_id: string }[] | null
  }
  const goalLines = ((goalsRes.data ?? []) as unknown as GoalRow[])
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
      const source = linked.length > 0
        ? `el saldo de ${linked.length} billetera(s) vinculada(s)`
        : 'el monto cargado a mano en la meta'
      const status = goal.achieved
        ? 'Lograda'
        : `${progress.percent}% (${money(progress.currentAmount)} de ${money(Number(goal.target_amount))}), falta ${money(progress.remaining)} — sale de ${source}`
      return `  - ${goal.name}: ${status}`
    })
    .join('\n') || '  - Sin metas de ahorro'

  // Billeteras: el saldo en su moneda y, si no es peso, cuánto es en pesos.
  const walletLines = wallets
    .map(w => {
      const currency = w.currency ?? 'ARS'
      const native = formatCurrency(Number(w.balance ?? 0), currency, 'byCurrency')
      const equivalent = currency === 'ARS' ? '' : ` = ${money(toARS(Number(w.balance ?? 0), currency))}`
      return `  - ${w.name}: ${native}${equivalent}`
    })
    .join('\n') || '  - Sin billeteras'

  const totalWallets = wallets.reduce((sum, w) => sum + toARS(Number(w.balance ?? 0), w.currency ?? 'ARS'), 0)

  return `
INFORME FINANCIERO: ${monthLabel.toUpperCase()}

Todos los montos de este informe ya están expresados en pesos argentinos. Lo que
estaba en otra moneda ya fue convertido a la cotización del dólar blue
(1 USD = ${money(rates.USD)}, 1 EUR = ${money(rates.EUR)}), así que no vuelvas a
convertir nada ni aclares tipos de cambio.

INGRESOS TOTALES: ${money(totalIngresos)}
GASTOS TOTALES: ${money(totalGastos)}
BALANCE DEL MES: ${money(totalIngresos - totalGastos)} (${totalIngresos >= totalGastos ? 'positivo' : 'negativo'})
TASA DE AHORRO: ${rate !== null ? `${rate.toFixed(1)}%` : 'no aplica (no hubo ingresos en el mes)'}

GASTOS POR CATEGORÍA:
${categoriaLines}

PRESUPUESTOS:
${budgetLines}

FIJOS Y RECURRENTES ACTIVOS (gasto mensual estimado): ${money(totalFixed)}
DETALLE FIJOS Y RECURRENTES:
${recurringLines}

METAS DE AHORRO:
${goalLines}

ESTADO ACTUAL DE BILLETERAS (total ${money(totalWallets)}):
${walletLines}
`.trim()
}

// GET /api/finance/ai-report?month=YYYY-MM
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const month = req.nextUrl.searchParams.get('month')
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Mes inválido' }, { status: 400 })
  }

  const { data: report } = await supabase
    .from('finance_reports')
    .select('id, user_id, month, content, created_at')
    .eq('user_id', user.id)
    .eq('month', month)
    .maybeSingle()

  return NextResponse.json({ report: report ?? null })
}

// POST /api/finance/ai-report  { month: 'YYYY-MM' }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { month, regenerate } = parsed.data

  const { data: existing } = await supabase
    .from('finance_reports')
    .select('id, user_id, month, content, created_at, regenerations')
    .eq('user_id', user.id)
    .eq('month', month)
    .maybeSingle()

  if (existing && !regenerate) return NextResponse.json({ report: existing })

  // El tope se chequea acá, antes de armar el contexto y mucho antes de llamar
  // a la API: es el único lugar donde Lumus gasta plata por click.
  if (existing && regenerate && !regenerationState(existing.regenerations).canRegenerate) {
    return NextResponse.json(
      {
        error: MAX_REPORT_REGENERATIONS === 1
          ? 'Este reporte ya se rehizo una vez. Solo se puede rehacer una vez por mes.'
          : `Este reporte ya se rehizo ${MAX_REPORT_REGENERATIONS} veces, que es el máximo por mes.`,
        report: existing,
      },
      { status: 409 },
    )
  }

  const [y, m] = month.split('-').map(Number)
  const monthLabel = new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  const context = await buildMonthContext(supabase, user.id, month)

  const systemPrompt = `Sos el asistente financiero de Lumus, un sistema operativo personal con IA. Generás informes mensuales de finanzas concisos, útiles y con un tono cercano y directo. Usá el español argentino. Incluí emojis estratégicamente para mejorar la legibilidad. Nunca inventés datos — usá solo los que se te dan.`

  const userPrompt = `${context}

Generá un informe financiero mensual para ${monthLabel} con estas secciones, en este orden:

RESUMEN DEL MES
2 a 3 oraciones con el panorama general: cómo quedó el mes, si fue positivo o negativo y algo destacado.

INGRESOS Y GASTOS
Usá líneas simples con etiqueta y valor: Ingresos totales, Gastos totales, Balance del mes y Tasa de ahorro. Los cuatro valores ya vienen calculados arriba — copialos, no los recalcules.

GASTOS POR CATEGORÍA
Top categorías con monto y porcentaje, ordenadas de mayor a menor.

PRESUPUESTOS
Estado de cada presupuesto si hay, o mencioná que no hay definidos.

METAS DE AHORRO
Progreso de cada meta, con el porcentaje y los montos tal como vienen arriba. Si no hay ninguna cargada, decilo en una línea y no inventes metas.

RECOMENDACIONES
3 a 5 recomendaciones concretas y accionables basadas en los datos reales del mes.

No uses Markdown: no uses ##, tablas con |, negritas, asteriscos ni bloques de código. Sé directo. No repitas datos obvios. Priorizá insights útiles.`

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ai-report: falta ANTHROPIC_API_KEY')
    return NextResponse.json({ error: 'El servicio de IA no está disponible en este momento.' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let response
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      // Sin thinking a propósito. En Sonnet 5, omitir el parámetro lo prende:
      // los tokens de razonamiento salen del mismo `max_tokens`, así que el
      // informe llegaría cortado a la mitad. Y para resumir totales que ya
      // vienen calculados no aporta nada — solo costo.
      thinking: { type: 'disabled' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
  } catch (err) {
    console.error('ai-report: fallo al llamar a Anthropic', err instanceof APIError ? err.message : err)
    return NextResponse.json({ error: 'No se pudo generar el informe. Probá de nuevo en unos minutos.' }, { status: 502 })
  }

  const content = response.content[0].type === 'text' ? response.content[0].text : ''

  if (!content) {
    console.error('ai-report: la respuesta de Anthropic no tenía contenido de texto', response.content[0]?.type)
    return NextResponse.json({ error: 'La IA no devolvió un informe válido. Probá de nuevo.' }, { status: 502 })
  }

  const saveQuery = existing
    ? supabase
        .from('finance_reports')
        .update({
          content,
          created_at: new Date().toISOString(),
          // Se suma acá y no antes de llamar: si la API falla, el usuario no
          // pierde su intento.
          regenerations: existing.regenerations + 1,
        })
        .eq('id', existing.id)
    : supabase
        .from('finance_reports')
        .insert({ user_id: user.id, month, content })

  const { data: saved, error: saveError } = await saveQuery
    .select('id, user_id, month, content, created_at, regenerations')
    .single()

  if (saveError || !saved) {
    return NextResponse.json({ error: 'Error al guardar el informe' }, { status: 500 })
  }

  return NextResponse.json({ report: saved })
}
