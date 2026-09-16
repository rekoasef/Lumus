import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateHoldingSchema } from '@/lib/validations/finance'
import { HOLDING_SELECT, toHolding } from '@/lib/finance/portfolio-data'

// PATCH /api/finance/holdings/:id — nombre o precio manual
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const parsed = updateHoldingSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('holdings')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select(HOLDING_SELECT)
    .single()

  // El CHECK de la base rechaza dejar sin precio algo que no tiene fuente.
  if (error) return NextResponse.json({ error: 'No se pudo actualizar la especie' }, { status: 400 })
  return NextResponse.json({ holding: toHolding(data) })
}

/**
 * Sacar una especie de la billetera, con todas sus operaciones.
 *
 * Se borra físicamente, como `budgets` y `saving_goals`: ninguna otra tabla la
 * referencia para mostrar historial, y sus operaciones se van en cascada. En la
 * parte 2, cuando una compra mueva efectivo, esto va a tener que devolver ese
 * efectivo — hoy ninguna operación lo mueve.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('holdings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
