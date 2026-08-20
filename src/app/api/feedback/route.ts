import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFeedbackSchema } from '@/lib/validations/feedback'

const MAX_USER_AGENT = 400

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createFeedbackSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  // El user agent se toma del header, no del body: si viniera del cliente
  // seria un campo de texto libre mas que habria que validar.
  const userAgent = req.headers.get('user-agent')?.slice(0, MAX_USER_AGENT) ?? null

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      user_id: user.id,
      kind: result.data.kind,
      message: result.data.message,
      path: result.data.path ?? null,
      user_agent: userAgent,
    })
    .select('id, kind, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ feedback: data }, { status: 201 })
}
