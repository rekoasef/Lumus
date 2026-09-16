import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InversionesView } from '@/components/modules/finanzas/inversiones-view'
import { getInvestmentContext, getWalletsAndCategories } from '@/lib/finance/server-data'
import { getExchangeRates } from '@/lib/finance/exchange-rates'
import { getPriceQuotes, loadHoldingsAndTrades, oldestTradeDate } from '@/lib/finance/portfolio-data'

export default async function InversionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ wallets }, { holdings, trades }, rates] = await Promise.all([
    getWalletsAndCategories(user.id),
    loadHoldingsAndTrades(supabase, user.id),
    getExchangeRates(),
  ])

  // Los precios se buscan en el server y solo de las fuentes que hacen falta:
  // CoinGecko y data912 limitan por rate. Y la serie de cotizaciones tiene que
  // llegar hasta la compra más vieja, porque su costo se lleva a dólares con el
  // dólar de **ese** día.
  const [{ events, rateHistory }, { quotes, fetchedAt }] = await Promise.all([
    getInvestmentContext(user.id, wallets, oldestTradeDate(trades)),
    getPriceQuotes(holdings),
  ])

  return (
    <InversionesView
      initialWallets={wallets}
      initialInvestmentEvents={events}
      holdings={holdings}
      trades={trades}
      quotes={quotes}
      quotesFetchedAt={fetchedAt}
      rates={rates}
      rateHistory={rateHistory}
    />
  )
}
