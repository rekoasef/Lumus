import { NextRequest, NextResponse } from 'next/server'
import Anthropic, { APIError } from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM requerido'),
  regenerate: z.boolean().optional().default(false),
})

type GastoRow = { amount: number; category: { name: string } | null }
type GoalRow = {
  name: string
  target_amount: number
  current_amount: number | null
  achieved: boolean | null
  wallet_id: string | null
  wallet: { name: string; balance: number; currency: string | null } | { name: string; balance: number; currency: string | null }[] | null
}

function recurringMonthlyAmount(amount: number, repeatType: string) {
  if (repeatType === 'daily') return amount * 30
  if (repeatType === 'weekly') return amount * (52 / 12)
  return amount
}

async function buildMonthContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  month: string,
): Promise<string> {
  const [y, m] = month.split('-').map(Number)
  const monthStart = `${month}-01`
  const nextM = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  const monthEnd = `${nextM}-01`

  const monthLabel = new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  const [gastosRes, ingresosRes, budgetsRes, recurrentesRes, goalsRes, walletsRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, category:finance_categories(name)')
      .eq('user_id', userId)
      .eq('type', 'gasto')
      .gte('date', monthStart)
      .lt('date', monthEnd)
      .is('deleted_at', null),
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'ingreso')
      .gte('date', monthStart)
      .lt('date', monthEnd)
      .is('deleted_at', null),
    supabase
      .from('budgets')
      .select('amount, category:finance_categories(name)')
      .eq('user_id', userId)
      .eq('month', m)
      .eq('year', y),
    supabase
      .from('recurring_transactions')
      .select('description, amount, type, repeat_type, next_date')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('saving_goals')
      .select('name, target_amount, current_amount, achieved, wallet_id, wallet:wallets(name, balance, currency)')
      .eq('user_id', userId),
    supabase
      .from('wallets')
      .select('name, balance, currency')
      .eq('user_id', userId)
      .is('deleted_at', null),
  ])

  const gastos = (gastosRes.data ?? []) as unknown as GastoRow[]
  const totalGastos = gastos.reduce((s, t) => s + Number(t.amount), 0)
  const totalIngresos = (ingresosRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0)

  // Gastos agrupados por categoría
  const byCat: Record<string, number> = {}
  for (const g of gastos) {
    const name = g.category?.name ?? 'Sin categoría'
    byCat[name] = (byCat[name] ?? 0) + Number(g.amount)
  }
  const categoriaLines = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amt]) => `  - ${name}: $${Math.round(amt).toLocaleString('es-AR')}`)
    .join('\n') || '  - Sin gastos registrados'

  // Presupuestos
  type BudgetRow = { amount: number; category: { name: string } | null }
  const budgetLines = (budgetsRes.data ?? [] as unknown as BudgetRow[]).length > 0
    ? (budgetsRes.data as unknown as BudgetRow[])
        .map(b => {
          const categoryName = b.category?.name ?? 'Sin categoría'
          const budgetAmount = Number(b.amount)
          const spent = byCat[categoryName] ?? 0
          const pct = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0
          const remaining = Math.max(budgetAmount - spent, 0)
          return `  - ${categoryName}: gastado $${Math.round(spent).toLocaleString('es-AR')} de $${Math.round(budgetAmount).toLocaleString('es-AR')} (${pct}%). Disponible: $${Math.round(remaining).toLocaleString('es-AR')}`
        })
        .join('\n')
    : '  - Sin presupuestos definidos'

  // Fijos y recurrentes — costo mensual
  const totalFixed = Math.round(
    (recurrentesRes.data ?? []).reduce((s, rec) => {
      if (rec.type !== 'gasto') return s
      return s + recurringMonthlyAmount(Number(rec.amount), rec.repeat_type)
    }, 0),
  )
  const recurringLines = (recurrentesRes.data ?? [])
    .map(r => `  - ${r.description ?? (r.type === 'gasto' ? 'Gasto fijo' : 'Ingreso fijo')} (${r.type}, ${r.repeat_type}): $${Number(r.amount).toLocaleString('es-AR')} · próxima fecha ${r.next_date}`)
    .join('\n') || '  - Sin fijos/recurrentes'

  // Metas de ahorro
  const goalLines = ((goalsRes.data ?? []) as unknown as GoalRow[])
    .map(g => {
      const wallet = Array.isArray(g.wallet) ? g.wallet[0] : g.wallet
      const currentAmount = wallet ? Number(wallet.balance ?? 0) : Number(g.current_amount ?? 0)
      const pct = g.target_amount > 0
        ? Math.round((currentAmount / Number(g.target_amount)) * 100)
        : 0
      const source = wallet
        ? `billetera vinculada "${wallet.name}"`
        : 'monto cargado en la meta'
      const status = g.achieved
        ? 'Lograda'
        : `${pct}% ($${Math.round(currentAmount).toLocaleString('es-AR')} / $${Math.round(Number(g.target_amount)).toLocaleString('es-AR')}) desde ${source}`
      return `  - ${g.name}: ${status}`
    })
    .join('\n') || '  - Sin metas de ahorro'

  // Billeteras
  const walletLines = (walletsRes.data ?? [])
    .map(w => `  - ${w.name}: ${w.currency} ${Number(w.balance).toLocaleString('es-AR')}`)
    .join('\n') || '  - Sin billeteras'

  return `
INFORME FINANCIERO: ${monthLabel.toUpperCase()}

INGRESOS TOTALES: $${Math.round(totalIngresos).toLocaleString('es-AR')}
GASTOS TOTALES: $${Math.round(totalGastos).toLocaleString('es-AR')}
BALANCE DEL MES: $${Math.round(totalIngresos - totalGastos).toLocaleString('es-AR')} (${totalIngresos >= totalGastos ? 'positivo' : 'negativo'})

GASTOS POR CATEGORÍA:
${categoriaLines}

PRESUPUESTOS:
${budgetLines}

FIJOS Y RECURRENTES ACTIVOS (gasto mensual estimado): $${totalFixed.toLocaleString('es-AR')}
DETALLE FIJOS Y RECURRENTES:
${recurringLines}

METAS DE AHORRO:
${goalLines}

ESTADO ACTUAL DE BILLETERAS:
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
    .select('id, user_id, month, content, created_at')
    .eq('user_id', user.id)
    .eq('month', month)
    .maybeSingle()

  if (existing && !regenerate) return NextResponse.json({ report: existing })

  const [y, m] = month.split('-').map(Number)
  const monthLabel = new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  const context = await buildMonthContext(supabase, user.id, month)

  const systemPrompt = `Sos el asistente financiero de Lumus, un sistema operativo personal con IA. Generás informes mensuales de finanzas concisos, útiles y con un tono cercano y directo. Usá el español argentino. Incluí emojis estratégicamente para mejorar la legibilidad. Nunca inventés datos — usá solo los que se te dan.`

  const userPrompt = `${context}

Generá un informe financiero mensual para ${monthLabel} con estas secciones, en este orden:

RESUMEN DEL MES
2 a 3 oraciones con el panorama general: cómo quedó el mes, si fue positivo o negativo y algo destacado.

INGRESOS Y GASTOS
Usá líneas simples con etiqueta y valor: Ingresos totales, Gastos totales, Balance del mes y Tasa de ahorro.

GASTOS POR CATEGORÍA
Top categorías con monto y porcentaje, ordenadas de mayor a menor.

PRESUPUESTOS
Estado de cada presupuesto si hay, o mencioná que no hay definidos.

METAS DE AHORRO
Progreso real de cada meta. Si la meta está vinculada a una billetera, usá el balance de esa billetera como dinero actual de la meta.

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
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
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
        .update({ content, created_at: new Date().toISOString() })
        .eq('id', existing.id)
    : supabase
        .from('finance_reports')
        .insert({ user_id: user.id, month, content })

  const { data: saved, error: saveError } = await saveQuery
    .select('id, user_id, month, content, created_at')
    .single()

  if (saveError || !saved) {
    return NextResponse.json({ error: 'Error al guardar el informe' }, { status: 500 })
  }

  return NextResponse.json({ report: saved })
}
