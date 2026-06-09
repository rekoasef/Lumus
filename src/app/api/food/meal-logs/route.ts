import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMealLogSchema } from '@/lib/validations/food'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const date = searchParams.get('date')
  const date_from = searchParams.get('date_from')
  const date_to = searchParams.get('date_to')

  let query = supabase
    .from('meal_logs')
    .select(`
      id, user_id, recipe_id, date, meal_type, name, calories, protein_g, photo_url, notes, created_at,
      recipe:recipes(id, title, calories)
    `)
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (date) query = query.eq('date', date)
  if (date_from) query = query.gte('date', date_from)
  if (date_to) query = query.lte('date', date_to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ meal_logs: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createMealLogSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('meal_logs')
    .insert({
      user_id: user.id,
      recipe_id: result.data.recipe_id ?? null,
      date: result.data.date,
      meal_type: result.data.meal_type,
      name: result.data.name ?? null,
      calories: result.data.calories ?? null,
      protein_g: result.data.protein_g ?? null,
      photo_url: result.data.photo_url ?? null,
      notes: result.data.notes ?? null,
    })
    .select(`
      id, user_id, recipe_id, date, meal_type, name, calories, protein_g, photo_url, notes, created_at,
      recipe:recipes(id, title, calories)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ meal_log: data }, { status: 201 })
}
