import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/finance/holdings/trades/:id — borrar una operación cargada por error.
 *
 * Si era la última de su especie, la especie se va con ella: sin operaciones
 * vale cero y solo ocupa lugar en la pantalla.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const { data: trade, error } = await supabase
    .from('holding_trades')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('holding_id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!trade) return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })

  const { count } = await supabase
    .from('holding_trades')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('holding_id', trade.holding_id)

  let holdingRemoved = false
  if (count === 0) {
    await supabase.from('holdings').delete().eq('id', trade.holding_id).eq('user_id', user.id)
    holdingRemoved = true
  }

  return NextResponse.json({ ok: true, holdingId: trade.holding_id, holdingRemoved })
}
