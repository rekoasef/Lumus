import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTaskSchema } from '@/lib/validations/tasks'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')

  let query = supabase
    .from('tasks')
    .select('id, title, description, priority, status, due_date, start_time, duration_minutes, parent_id, routine_id, created_at, updated_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .is('parent_id', null)
    .order('created_at', { ascending: false })

  if (status && status !== 'todas') {
    query = query.eq('status', status)
  }
  if (priority && priority !== 'todas') {
    query = query.eq('priority', priority)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createTaskSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: result.data.title,
      description: result.data.description ?? null,
      priority: result.data.priority,
      due_date: result.data.due_date ?? null,
      start_time: result.data.start_time ?? null,
      duration_minutes: result.data.duration_minutes ?? null,
      parent_id: result.data.parent_id ?? null,
      routine_id: null,
      deleted_at: null,
    })
    .select('id, title, description, priority, status, due_date, start_time, duration_minutes, parent_id, routine_id, created_at, updated_at, deleted_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ task: data }, { status: 201 })
}
