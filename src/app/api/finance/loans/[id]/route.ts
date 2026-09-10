import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateLoanSchema } from '@/lib/validations/finance'
import { LOAN_SELECT } from '../shared'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = updateLoanSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  // La dirección no se edita: cambiarla daría vuelta el signo del desembolso ya
  // registrado y el saldo de la billetera quedaría mintiendo el doble del
  // capital. Para eso se borra el préstamo y se carga de nuevo.
  const { data: loan, error } = await supabase
    .from('loans')
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select(LOAN_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!loan) return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })

  return NextResponse.json({ loan })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  // Baja lógica, y los movimientos se quedan: la plata del desembolso y de cada
  // cuota **se movió de verdad**. Borrarlos cambiaría saldos por una decisión
  // de archivo, que es justo lo que la regla de soft delete viene a evitar.
  const { error } = await supabase
    .from('loans')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
