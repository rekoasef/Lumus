import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBodyRecordSchema } from '@/lib/validations/fit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '30', 10)

  const { data, error } = await supabase
    .from('body_records')
    .select('id, user_id, date, weight_kg, body_fat_pct, muscle_kg, notes, created_at')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ records: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createBodyRecordSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('body_records')
    .insert({
      user_id:      user.id,
      date:         result.data.date,
      weight_kg:    result.data.weight_kg ?? null,
      body_fat_pct: result.data.body_fat_pct ?? null,
      muscle_kg:    result.data.muscle_kg ?? null,
      notes:        result.data.notes ?? null,
    })
    .select('id, user_id, date, weight_kg, body_fat_pct, muscle_kg, notes, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ record: data }, { status: 201 })
}
