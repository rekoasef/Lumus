import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSessionSchema } from '@/lib/validations/fit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const date = searchParams.get('date')
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)

  let query = supabase
    .from('workout_sessions')
    .select(`
      id, user_id, routine_id, date, duration_min, notes, completed, created_at,
      routine:workout_routines(id, name, goal)
    `)
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (date) query = query.eq('date', date)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sessions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createSessionSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id:      user.id,
      routine_id:   result.data.routine_id ?? null,
      date:         result.data.date,
      duration_min: result.data.duration_min ?? null,
      notes:        result.data.notes ?? null,
      completed:    result.data.completed,
    })
    .select(`
      id, user_id, routine_id, date, duration_min, notes, completed, created_at,
      routine:workout_routines(id, name, goal)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ session: data }, { status: 201 })
}
