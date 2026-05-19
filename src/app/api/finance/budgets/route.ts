import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBudgetSchema } from '@/lib/validations/finance'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const now = new Date()
  const month = Number(url.searchParams.get('month') ?? now.getMonth() + 1)
  const year  = Number(url.searchParams.get('year')  ?? now.getFullYear())

  const { data: budgets, error } = await supabase
    .from('budgets')
    .select(`
      id, amount, month, year, created_at, category_id,
      category:finance_categories ( id, name, color, icon )
    `)
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Rango del mes para sumar gastos
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd   = new Date(year, month, 0).toISOString().slice(0, 10) // último día del mes

  const categoryIds = (budgets ?? []).map(b => b.category_id)
  let spentByCategory: Record<string, number> = {}

  if (categoryIds.length) {
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('user_id', user.id)
      .eq('type', 'gasto')
      .is('deleted_at', null)
      .in('category_id', categoryIds)
      .gte('date', monthStart)
      .lte('date', monthEnd)

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

    spentByCategory = (tx ?? []).reduce<Record<string, number>>((acc, t) => {
      if (!t.category_id) return acc
      acc[t.category_id] = (acc[t.category_id] ?? 0) + Number(t.amount)
      return acc
    }, {})
  }

  const enriched = (budgets ?? []).map(b => ({
    ...b,
    spent: spentByCategory[b.category_id] ?? 0,
  }))

  return NextResponse.json({ budgets: enriched, month, year })
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
    .select(`
      id, amount, month, year, created_at, category_id,
      category:finance_categories ( id, name, color, icon )
    `)
    .single()

  if (error) {
    // Manejo amigable del unique violation (ya hay budget para esa categoría/mes/año)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ya hay un presupuesto para esta categoría en ese mes' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ budget: { ...data, spent: 0 } }, { status: 201 })
}
