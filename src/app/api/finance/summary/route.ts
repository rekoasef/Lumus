import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { financeSummaryQuerySchema } from '@/lib/validations/finance'
import type { FinanceSummaryRow } from '@/types/finance.types'

/**
 * Totales agregados por tipo + categoría + moneda para un rango de fechas.
 *
 * Devuelve decenas de filas como mucho, sin importar cuántas transacciones
 * haya detrás: por eso reemplaza a traer las filas y sumarlas en el cliente,
 * que dependía de un tope y mostraba totales incompletos al pasarlo.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const result = financeSummaryQuerySchema.safeParse({
    from: searchParams.get('from'),
    to:   searchParams.get('to'),
  })
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('get_finance_summary', {
    p_from: result.data.from ?? undefined,
    p_to:   result.data.to ?? undefined,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ summary: (data ?? []) as unknown as FinanceSummaryRow[] })
}
