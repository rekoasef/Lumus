import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema } from '@/lib/validations/profile'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = updateProfileSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { life_summary, ...profileFields } = result.data

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .update({ ...profileFields, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .select('name, occupation, monthly_salary, birth_date')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (life_summary !== undefined) {
    const { error: summaryError } = await supabase
      .from('user_life_summary')
      .upsert({ user_id: user.id, content: life_summary ?? '', updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

    if (summaryError) return NextResponse.json({ error: summaryError.message }, { status: 500 })
  }

  return NextResponse.json({ profile, life_summary: life_summary ?? null })
}
