import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRoutineSchema } from '@/lib/validations/fit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('workout_routines')
    .select(`
      id, user_id, name, description, goal, ai_generated, created_at, updated_at,
      exercises:workout_routine_exercises(
        id, routine_id, exercise_id, sets, reps, rest_seconds, order_index,
        exercise:workout_exercises(id, name, muscle_group)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ routines: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createRoutineSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data: routine, error: routineError } = await supabase
    .from('workout_routines')
    .insert({
      user_id:      user.id,
      name:         result.data.name,
      description:  result.data.description ?? null,
      goal:         result.data.goal ?? null,
      ai_generated: false,
    })
    .select('id, user_id, name, description, goal, ai_generated, created_at, updated_at')
    .single()

  if (routineError) return NextResponse.json({ error: routineError.message }, { status: 500 })

  if (result.data.exercises && result.data.exercises.length > 0) {
    const exerciseRows = result.data.exercises.map((ex, i) => ({
      routine_id:   routine.id,
      exercise_id:  ex.exercise_id,
      sets:         ex.sets ?? null,
      reps:         ex.reps ?? null,
      rest_seconds: ex.rest_seconds ?? null,
      order_index:  ex.order_index ?? i,
    }))

    const { error: exError } = await supabase
      .from('workout_routine_exercises')
      .insert(exerciseRows)

    if (exError) return NextResponse.json({ error: exError.message }, { status: 500 })
  }

  const { data: full } = await supabase
    .from('workout_routines')
    .select(`
      id, user_id, name, description, goal, ai_generated, created_at, updated_at,
      exercises:workout_routine_exercises(
        id, routine_id, exercise_id, sets, reps, rest_seconds, order_index,
        exercise:workout_exercises(id, name, muscle_group)
      )
    `)
    .eq('id', routine.id)
    .single()

  return NextResponse.json({ routine: full }, { status: 201 })
}
