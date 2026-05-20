import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM requerido'),
})

type GastoRow = { amount: number; category: { name: string } | null }

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

  const [gastosRes, ingresosRes, budgetsRes, subsRes, goalsRes, walletsRes] = await Promise.all([
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
      .from('subscriptions')
      .select('name, amount, billing_cycle, currency')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('saving_goals')
      .select('name, target_amount, current_amount, achieved')
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
        .map(b => `  - ${b.category?.name ?? 'Sin categoría'}: presupuesto $${Math.round(Number(b.amount)).toLocaleString('es-AR')}`)
        .join('\n')
    : '  - Sin presupuestos definidos'

  // Suscripciones — costo mensual
  const totalSubs = Math.round(
    (subsRes.data ?? []).reduce((s, sub) => {
      if (sub.billing_cycle === 'anual')   return s + Number(sub.amount) / 12
      if (sub.billing_cycle === 'semanal') return s + Number(sub.amount) * (52 / 12)
      return s + Number(sub.amount)
    }, 0),
  )
  const subLines = (subsRes.data ?? [])
    .map(s => `  - ${s.name} (${s.billing_cycle}): ${s.currency} ${Number(s.amount).toLocaleString('es-AR')}`)
    .join('\n') || '  - Sin vencimientos'

  // Metas de ahorro
  const goalLines = (goalsRes.data ?? [])
    .map(g => {
      const pct = g.target_amount > 0
        ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)
        : 0
      const status = g.achieved ? '✅ Lograda' : `${pct}% (${Math.round(Number(g.current_amount)).toLocaleString('es-AR')} / ${Math.round(Number(g.target_amount)).toLocaleString('es-AR')})`
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

VENCIMIENTOS ACTIVOS (costo mensual estimado): $${totalSubs.toLocaleString('es-AR')}
DETALLE VENCIMIENTOS:
${subLines}

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

  const { month } = parsed.data

  // Si ya existe, devolvemos el existente
  const { data: existing } = await supabase
    .from('finance_reports')
    .select('id, user_id, month, content, created_at')
    .eq('user_id', user.id)
    .eq('month', month)
    .maybeSingle()

  if (existing) return NextResponse.json({ report: existing })

  const [y, m] = month.split('-').map(Number)
  const monthLabel = new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  const context = await buildMonthContext(supabase, user.id, month)

  const systemPrompt = `Sos el asistente financiero de Lumus, un sistema operativo personal con IA. Generás informes mensuales de finanzas concisos, útiles y con un tono cercano y directo. Usá el español argentino. Incluí emojis estratégicamente para mejorar la legibilidad. Nunca inventés datos — usá solo los que se te dan.`

  const userPrompt = `${context}

Generá un informe financiero mensual para ${monthLabel} con exactamente estas secciones en orden:

## 📊 Resumen del mes
[2-3 oraciones con el panorama general: cómo quedó el mes, si fue positivo o negativo, algo destacado]

## 💰 Ingresos y gastos
[Tabla o lista clara con los totales y el balance]

## 🏷️ Gastos por categoría
[Las top categorías de gasto con montos, ordenadas de mayor a menor]

## 📋 Presupuestos
[Estado de cada presupuesto si hay, o mencioná que no hay definidos]

## 🎯 Metas de ahorro
[Progreso de cada meta con porcentaje]

## 💡 Recomendaciones
[3 a 5 recomendaciones concretas y accionables basadas en los datos reales del mes]

Sé directo. No repitas datos obvios. Priorizá insights útiles.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''

  const { data: saved, error: saveError } = await supabase
    .from('finance_reports')
    .insert({ user_id: user.id, month, content })
    .select('id, user_id, month, content, created_at')
    .single()

  if (saveError || !saved) {
    return NextResponse.json({ error: 'Error al guardar el informe' }, { status: 500 })
  }

  return NextResponse.json({ report: saved })
}
