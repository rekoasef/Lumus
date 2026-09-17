import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { acceptTermsSchema } from '@/lib/validations/legal'
import { TERMS_VERSION } from '@/lib/legal/owner'

/** Acepta la versión vigente de los términos. Para quien ya tenía cuenta, o cuando cambian. */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const result = acceptTermsSchema.safeParse(await req.json().catch(() => null))
  if (!result.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  // Se acepta lo que la persona tuvo en pantalla. Si la versión cambió mientras
  // lo leía, que lo vuelva a leer.
  if (result.data.version !== TERMS_VERSION) {
    return NextResponse.json({ error: 'Los términos se actualizaron. Recargá la página para ver la versión nueva.' }, { status: 409 })
  }

  const { error } = await supabase
    .from('legal_acceptances')
    .upsert(
      { user_id: user.id, document: 'terminos', version: TERMS_VERSION, source: 'app' },
      { onConflict: 'user_id,document,version', ignoreDuplicates: true },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ version: TERMS_VERSION })
}
