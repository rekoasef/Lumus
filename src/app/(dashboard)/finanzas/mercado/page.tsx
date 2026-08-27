import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MarketDashboard } from '@/components/modules/finanzas/market-dashboard'
import { getArgentineStocks, getCryptoChart, type ChartPoint } from '@/lib/finance/market'
import { fetchRateHistory, yearsAgo } from '@/lib/finance/rate-history'
import { getCryptoMarket } from '@/lib/finance/crypto-prices'

const LABELS = {
  back: 'Volver a finanzas',
  title: 'Mercado',
  subtitle: 'Cómo viene el dólar, la cripto y el panel argentino.',
} as const

/** Qué cripto se grafica. La más mirada, y la que casi todos entienden. */
const FEATURED_CRYPTO = 'bitcoin'

export const dynamic = 'force-dynamic'

/**
 * Pantalla de mercado.
 *
 * No es un diferencial y no está hecha como si lo fuera: Binance y TradingView
 * hacen esto mejor. Está para **no tener que salir de la app** — el que abre
 * Lumus para cargar un gasto puede mirar cómo viene el dólar sin cambiar de
 * pestaña.
 *
 * El gráfico del dólar sale de la propia base (`exchange_rate_history`), no de
 * una API: es el único bloque de esta pantalla que no se puede romper por una
 * fuente externa, y es justo el que más le importa a alguien acá.
 */
export default async function MercadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [rateHistory, crypto, cryptoChart, stocks] = await Promise.all([
    // Cinco años, que es el rango más largo del selector. Pedir todo serían
    // cinco viajes a la base en cada carga.
    fetchRateHistory(supabase, yearsAgo(5)),
    getCryptoMarket(),
    getCryptoChart(FEATURED_CRYPTO, 30),
    getArgentineStocks(20),
  ])

  // `fetchRateHistory` devuelve de más nueva a más vieja; el gráfico va al revés.
  const dollarHistory: ChartPoint[] = rateHistory
    .map(r => ({ date: r.date, value: r.usd }))
    .reverse()

  return (
    <div className="min-h-screen px-4 py-6 sm:px-5 sm:py-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[900px]">
        <Link
          href="/finanzas"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          <ArrowLeft size={13} /> {LABELS.back}
        </Link>

        <div className="mb-6 mt-4">
          <h1 className="lumus-heading text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{LABELS.title}</h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{LABELS.subtitle}</p>
        </div>

        <MarketDashboard
          dollarHistory={dollarHistory}
          crypto={crypto?.quotes ?? []}
          cryptoFetchedAt={crypto?.fetchedAt ?? null}
          cryptoChart={cryptoChart?.data ?? null}
          cryptoChartId={FEATURED_CRYPTO}
          stocks={stocks?.data ?? null}
          stocksFetchedAt={stocks?.fetchedAt ?? null}
        />
      </div>
    </div>
  )
}
