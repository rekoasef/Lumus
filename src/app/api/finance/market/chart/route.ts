import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isCryptoId } from '@/lib/finance/crypto-prices'
import { getCryptoChart } from '@/lib/finance/market'

/**
 * La serie de una cripto, para que el gráfico pueda cambiar de moneda sin
 * recargar la pantalla.
 *
 * El navegador le pega **a esto**, no a CoinGecko: así el caché del server
 * sigue valiendo para todos y el límite de rate no depende de cuántas veces
 * alguien toque la lista.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id') ?? ''

  // Se valida contra la lista propia y no se pasa lo que venga: sin esto, la
  // ruta sería un proxy abierto a cualquier path de CoinGecko.
  if (!isCryptoId(id)) {
    return NextResponse.json({ error: 'Moneda no soportada' }, { status: 400 })
  }

  const chart = await getCryptoChart(id, 30)
  if (!chart) {
    return NextResponse.json({ error: 'Sin datos' }, { status: 502 })
  }

  return NextResponse.json({ points: chart.data, fetchedAt: chart.fetchedAt })
}
