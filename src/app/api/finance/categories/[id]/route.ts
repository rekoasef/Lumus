import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateCategorySchema } from '@/lib/validations/finance'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = updateCategorySchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('finance_categories')
    .update(result.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, type, icon, color, is_default')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ category: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  // No permitir borrar categorías default
  const { data: cat } = await supabase
    .from('finance_categories')
    .select('is_default')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (cat?.is_default) {
    return NextResponse.json({ error: 'No podés eliminar categorías por defecto' }, { status: 400 })
  }

  const { error } = await supabase
    .from('finance_categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
