import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertHealthLogSchema } from '@/lib/validations/fit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('health_logs')
    .select('id, user_id, date, water_ml, sleep_hours, steps, created_at')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ health_log: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = upsertHealthLogSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('health_logs')
    .upsert({
      user_id:     user.id,
      date:        result.data.date,
      water_ml:    result.data.water_ml ?? 0,
      sleep_hours: result.data.sleep_hours ?? null,
      steps:       result.data.steps ?? null,
    }, { onConflict: 'user_id,date' })
    .select('id, user_id, date, water_ml, sleep_hours, steps, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ health_log: data })
}
