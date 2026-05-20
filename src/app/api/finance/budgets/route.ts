import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBudgetSchema } from '@/lib/validations/finance'

async function fetchBudgetsWithSpent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  month: number,
  year: number,
) {
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('id, amount, month, year, created_at, category_id, category:finance_categories ( id, name, color, icon )')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: true })

  if (error) throw error

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd   = new Date(year, month, 0).toISOString().slice(0, 10)
  const categoryIds = (budgets ?? []).map(b => b.category_id)
  let spentByCategory: Record<string, number> = {}

  if (categoryIds.length) {
    const { data: tx } = await supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('user_id', userId)
      .eq('type', 'gasto')
      .is('deleted_at', null)
      .in('category_id', categoryIds)
      .gte('date', monthStart)
      .lte('date', monthEnd)

    spentByCategory = (tx ?? []).reduce<Record<string, number>>((acc, t) => {
      if (!t.category_id) return acc
      acc[t.category_id] = (acc[t.category_id] ?? 0) + Number(t.amount)
      return acc
    }, {})
  }

  return (budgets ?? []).map(b => ({ ...b, spent: spentByCategory[b.category_id] ?? 0 }))
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url  = new URL(req.url)
  const now  = new Date()
  const month = Number(url.searchParams.get('month') ?? now.getMonth() + 1)
  const year  = Number(url.searchParams.get('year')  ?? now.getFullYear())

  try {
    let budgets = await fetchBudgetsWithSpent(supabase, user.id, month, year)

    // Auto-copiar del mes más reciente si el mes pedido no tiene presupuestos
    // Solo aplica para el mes actual y futuros (no queremos tocar el pasado)
    const requestedDate = new Date(year, month - 1, 1)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const shouldAutoCopy = budgets.length === 0 && requestedDate >= currentMonthStart

    if (shouldAutoCopy) {
      // Buscar el mes más reciente con presupuestos (hasta 12 meses atrás)
      let sourceRows: { category_id: string; amount: number }[] | null = null

      for (let i = 1; i <= 12; i++) {
        let lookMonth = month - i
        let lookYear  = year
        while (lookMonth <= 0) { lookMonth += 12; lookYear-- }

        const { data: prev } = await supabase
          .from('budgets')
          .select('category_id, amount')
          .eq('user_id', user.id)
          .eq('month', lookMonth)
          .eq('year', lookYear)

        if (prev && prev.length > 0) {
          sourceRows = prev
          break
        }
      }

      if (sourceRows && sourceRows.length > 0) {
        await supabase.from('budgets').insert(
          sourceRows.map(b => ({
            user_id:     user.id,
            category_id: b.category_id,
            amount:      b.amount,
            month,
            year,
          }))
        )
        // Re-fetch con gastos reales del mes
        budgets = await fetchBudgetsWithSpent(supabase, user.id, month, year)
      }
    }

    return NextResponse.json({ budgets, month, year, auto_copied: shouldAutoCopy && budgets.length > 0 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createBudgetSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      user_id:     user.id,
      category_id: result.data.category_id,
      amount:      result.data.amount,
      month:       result.data.month,
      year:        result.data.year,
    })
    .select('id, amount, month, year, created_at, category_id, category:finance_categories ( id, name, color, icon )')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ya hay un presupuesto para esta categoría en ese mes' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calcular gastos reales del mes para la categoría recién presupuestada
  const { month, year, category_id } = result.data
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd   = new Date(year, month, 0).toISOString().slice(0, 10)

  const { data: spentTx } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('type', 'gasto')
    .eq('category_id', category_id)
    .is('deleted_at', null)
    .gte('date', monthStart)
    .lte('date', monthEnd)

  const spent = (spentTx ?? []).reduce((sum, t) => sum + Number(t.amount), 0)

  return NextResponse.json({ budget: { ...data, spent } }, { status: 201 })
}
