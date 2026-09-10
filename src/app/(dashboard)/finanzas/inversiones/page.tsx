import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InversionesView } from '@/components/modules/finanzas/inversiones-view'
import { getInvestmentContext, getWalletsAndCategories } from '@/lib/finance/server-data'
import { getCryptoPrices } from '@/lib/finance/crypto-prices'
import type { Holding } from '@/lib/finance/holdings'

export default async function InversionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Los precios se buscan en el server: CoinGecko limita por rate y con varios
  // usuarios recargando la pantalla el plan free se agota en minutos.
  const [{ wallets }, holdingsRes] = await Promise.all([
    getWalletsAndCategories(user.id),
    supabase
      .from('holdings')
      .select('id, name, kind, price_source, quantity, purchase_price, purchase_currency, purchase_date, manual_price')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const holdings = (holdingsRes.data ?? []) as unknown as Holding[]

  // El costo de una compra en pesos se lleva a dólares con la cotización de
  // **ese** día, así que la serie tiene que llegar hasta la compra más vieja.
  const oldestPurchase = holdings.reduce<string | null>(
    (oldest, h) => (!oldest || h.purchase_date < oldest ? h.purchase_date : oldest),
    null,
  )

  const [{ events, rateHistory }, cryptoPrices] = await Promise.all([
    getInvestmentContext(user.id, wallets, oldestPurchase),
    getCryptoPrices(holdings.map(h => h.price_source).filter((id): id is string => Boolean(id))),
  ])

  return (
    <InversionesView
      initialWallets={wallets}
      initialInvestmentEvents={events}
      initialHoldings={holdings}
      cryptoPrices={Object.fromEntries(cryptoPrices)}
      rateHistory={rateHistory}
    />
  )
}
