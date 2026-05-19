import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRecipeSchema } from '@/lib/validations/food'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const favorite = searchParams.get('favorite')
  const ai_generated = searchParams.get('ai_generated')
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)

  let query = supabase
    .from('recipes')
    .select('id, title, description, ingredients, instructions, calories, protein_g, carbs_g, fat_g, prep_time_min, ai_generated, favorite, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (favorite === 'true') query = query.eq('favorite', true)
  if (ai_generated === 'true') query = query.eq('ai_generated', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ recipes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createRecipeSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      user_id: user.id,
      title: result.data.title,
      description: result.data.description ?? null,
      ingredients: result.data.ingredients ?? null,
      instructions: result.data.instructions ?? null,
      calories: result.data.calories ?? null,
      protein_g: result.data.protein_g ?? null,
      carbs_g: result.data.carbs_g ?? null,
      fat_g: result.data.fat_g ?? null,
      prep_time_min: result.data.prep_time_min ?? null,
      ai_generated: body.ai_generated === true,
      favorite: false,
    })
    .select('id, title, description, ingredients, instructions, calories, protein_g, carbs_g, fat_g, prep_time_min, ai_generated, favorite, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ recipe: data }, { status: 201 })
}
