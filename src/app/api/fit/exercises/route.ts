import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createExerciseSchema } from '@/lib/validations/fit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('workout_exercises')
    .select('id, user_id, name, muscle_group, description, is_default')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ exercises: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createExerciseSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('workout_exercises')
    .insert({
      user_id:      user.id,
      name:         result.data.name,
      muscle_group: result.data.muscle_group ?? null,
      description:  result.data.description ?? null,
      is_default:   false,
    })
    .select('id, user_id, name, muscle_group, description, is_default')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ exercise: data }, { status: 201 })
}
