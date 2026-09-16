import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getArsQuotes, pesoTickers } from '@/lib/finance/market'

// GET /api/finance/market/instruments?kind=accion|cedear
// Los tickers que se pueden cargar con precio automático. Si data912 no
// contesta devuelve la lista vacía: el formulario deja escribir el ticker igual.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const kind = req.nextUrl.searchParams.get('kind')
  if (kind !== 'accion' && kind !== 'cedear') {
    return NextResponse.json({ error: 'kind tiene que ser accion o cedear' }, { status: 400 })
  }

  const snapshot = await getArsQuotes(kind)
  const symbols = snapshot ? pesoTickers(snapshot.data) : []

  return NextResponse.json({ symbols, available: snapshot !== null })
}
