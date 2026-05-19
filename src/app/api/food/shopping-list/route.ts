import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createShoppingItemSchema } from '@/lib/validations/food'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const checked = searchParams.get('checked')

  let query = supabase
    .from('shopping_list_items')
    .select('id, user_id, name, quantity, category, checked, auto_added, created_at')
    .eq('user_id', user.id)
    .order('category', { ascending: true })
    .order('created_at', { ascending: true })

  if (checked === 'false') query = query.eq('checked', false)
  if (checked === 'true') query = query.eq('checked', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createShoppingItemSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('shopping_list_items')
    .insert({
      user_id: user.id,
      name: result.data.name,
      quantity: result.data.quantity ?? null,
      category: result.data.category ?? null,
      checked: false,
      auto_added: body.auto_added === true,
    })
    .select('id, user_id, name, quantity, category, checked, auto_added, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ item: data }, { status: 201 })
}
