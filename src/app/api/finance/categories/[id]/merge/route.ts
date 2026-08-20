import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mergeCategorySchema } from '@/lib/validations/finance'
import type { MergeCategoriesResult } from '@/types'

/**
 * Cuántas filas se van a mover si se unifica esta categoría.
 * Lo consume el diálogo de confirmación: sin este número, el usuario
 * confirma una acción irreversible a ciegas.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const [transactions, recurring, budgets] = await Promise.all([
    // Solo las visibles: contar tambien las borradas mostraria un numero que
    // no se corresponde con nada de lo que el usuario ve en pantalla.
    supabase.from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id).eq('user_id', user.id).is('deleted_at', null),
    supabase.from('recurring_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id).eq('user_id', user.id),
    supabase.from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id).eq('user_id', user.id),
  ])

  return NextResponse.json({
    preview: {
      transactions: transactions.count ?? 0,
      recurring: recurring.count ?? 0,
      budgets: budgets.count ?? 0,
    },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = mergeCategorySchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  // Toda la unificación pasa dentro de la función: son varios UPDATE que
  // tienen que aplicarse todos o ninguno.
  const { data, error } = await supabase.rpc('merge_finance_categories', {
    p_source: id,
    p_target: result.data.target_id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ merged: data as unknown as MergeCategoriesResult })
}
