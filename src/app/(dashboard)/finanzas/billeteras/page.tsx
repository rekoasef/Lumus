import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BilleterasView } from '@/components/modules/finanzas/billeteras-view'
import { getInvestmentContext, getWalletsAndCategories } from '@/lib/finance/server-data'

export default async function BilleterasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { wallets } = await getWalletsAndCategories(user.id)

  // Las cotizaciones solo hacen falta para el rendimiento en dólares de una
  // inversión. Sin billeteras de inversión, `getInvestmentContext` no consulta
  // movimientos y la serie sale vacía.
  const { events, rateHistory } = await getInvestmentContext(user.id, wallets)

  return (
    <BilleterasView
      initialWallets={wallets}
      initialInvestmentEvents={events}
      rateHistory={rateHistory}
    />
  )
}
