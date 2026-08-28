import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FinanzasDashboard } from '@/components/modules/finanzas/finanzas-dashboard'
import type { Wallet, FinanceCategory, Budget, SavingGoal, RecurringTransaction, FinanceSummaryRow } from '@/types/finance.types'
import { frequentDefaults, FREQUENT_WINDOW_DAYS } from '@/lib/finance/frequent-defaults'
import { getCryptoPrices } from '@/lib/finance/crypto-prices'
import type { Holding } from '@/lib/finance/holdings'
import { fetchRateHistory } from '@/lib/finance/rate-history'
import { rawTotalsByCategory } from '@/lib/finance/summary'
import type { InvestmentEvent } from '@/lib/finance/investment'

export default async function FinanzasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10)

  const [walletsRes, categoriesRes, categoryLookupRes, monthSummaryRes, budgetsRes, goalsRes, recurringRes] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, type, balance, currency, color, icon, investment_baseline, investment_baseline_date, created_at, updated_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('finance_categories')
      .select('id, name, type, icon, color, is_default')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true }),
    // Sin filtrar por `deleted_at`: un movimiento viejo de una categoría
    // borrada tiene que seguir mostrando su nombre y su color.
    supabase
      .from('finance_categories')
      .select('id, name, color, icon')
      .eq('user_id', user.id),
    // Totales del mes agregados en SQL — antes salían de filtrar en memoria
    // las últimas 500 transacciones, que con el histórico ya no alcanzaban.
    supabase.rpc('get_finance_summary', { p_from: monthStart, p_to: monthEnd }),
    supabase
      .from('budgets')
      .select('id, amount, month, year, created_at, category_id, category:finance_categories(id, name, color, icon)')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year)
      .order('created_at', { ascending: true }),
    supabase
      .from('saving_goals')
      .select('id, name, target_amount, current_amount, target_date, achieved, icon, created_at, updated_at, saving_goal_wallets(wallet_id)')
      .eq('user_id', user.id)
      .order('achieved', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('recurring_transactions')
      .select(`id, wallet_id, category_id, type, amount, description, repeat_type, repeat_day, next_date, active, created_at, updated_at, wallet:wallets(id, name, color), category:finance_categories(id, name, color, icon)`)
      .eq('user_id', user.id)
      .order('next_date', { ascending: true }),
  ])

  const wallets = (walletsRes.data ?? []) as Wallet[]
  const categories = (categoriesRes.data ?? []) as FinanceCategory[]
  const categoryLookup = (categoryLookupRes.data ?? []) as Pick<FinanceCategory, 'id' | 'name' | 'color' | 'icon'>[]
  const recurring = (recurringRes.data ?? []) as RecurringTransaction[]
  const monthSummary = (monthSummaryRes.data ?? []) as unknown as FinanceSummaryRow[]

  // Lo gastado por categoría en el mes sale del mismo agregado que los KPIs
  const spentByCategory = rawTotalsByCategory(monthSummary, 'gasto')

  const budgets = (budgetsRes.data ?? []).map(b => ({
    ...b,
    spent: spentByCategory[b.category_id] ?? 0,
  })) as Budget[]

  const goals = ((goalsRes.data ?? []) as unknown as (Omit<SavingGoal, 'wallet_ids'> & { saving_goal_wallets: { wallet_id: string }[] })[])
    .map(({ saving_goal_wallets, ...goal }) => ({ ...goal, wallet_ids: saving_goal_wallets.map(w => w.wallet_id) }))

  // Con qué precargar el formulario de un gasto nuevo. Se pide acá y no en el
  // cliente: son dos columnas de los últimos movimientos, y el formulario
  // tiene que abrir ya lleno, no llenarse después.
  const frequentWindowStart = new Date()
  frequentWindowStart.setDate(frequentWindowStart.getDate() - FREQUENT_WINDOW_DAYS)

  const { data: recentRows } = await supabase
    .from('transactions')
    .select('category_id, wallet_id')
    .eq('user_id', user.id)
    .eq('type', 'gasto')
    .is('deleted_at', null)
    .gte('date', frequentWindowStart.toISOString().slice(0, 10))
    .order('date', { ascending: false })
    .limit(200)

  const defaults = frequentDefaults(recentRows ?? [])

  // ── Inversiones ──
  // Los precios se buscan en el server: CoinGecko limita por rate y con varios
  // usuarios recargando la pantalla el plan free se agota en minutos.
  const { data: holdingRows } = await supabase
    .from('holdings')
    .select('id, name, kind, price_source, quantity, purchase_price, purchase_currency, purchase_date, manual_price')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const holdings = (holdingRows ?? []) as unknown as Holding[]

  // El costo de una compra en pesos se lleva a dólares con la cotización de
  // **ese** día, así que la serie tiene que llegar hasta la compra más vieja.
  // Un `limit` fijo dejaba sin rendimiento a cualquier tenencia anterior, en
  // silencio.
  const oldestPurchase = holdings.reduce<string | null>(
    (oldest, h) => (!oldest || h.purchase_date < oldest ? h.purchase_date : oldest),
    null,
  )

  // ── Billeteras de inversión ──
  // Los aportes/retiros separan "puse más plata" de "esto rindió", y los
  // rendimientos son el historial de cuánto fue dando. Solo cuentan los
  // posteriores a la línea de base: lo anterior ya está dentro de ese número, y
  // sumarlo de nuevo lo contaría dos veces.
  const investmentWallets = wallets.filter(
    w => w.type === 'inversion' && w.investment_baseline_date !== null,
  )

  const oldestBaseline = investmentWallets.reduce<string | null>(
    (oldest, w) => {
      const date = w.investment_baseline_date
      return date && (!oldest || date < oldest) ? date : oldest
    },
    null,
  )

  const investmentEvents: Record<string, InvestmentEvent[]> = {}

  if (investmentWallets.length > 0 && oldestBaseline) {
    const { data: eventRows } = await supabase
      .from('transactions')
      .select('wallet_id, date, amount, type')
      .eq('user_id', user.id)
      .in('type', ['transferencia', 'rendimiento'])
      .in('wallet_id', investmentWallets.map(w => w.id))
      .gte('date', oldestBaseline)
      .is('deleted_at', null)
      .order('date', { ascending: true })

    for (const wallet of investmentWallets) {
      const from = wallet.investment_baseline_date!
      investmentEvents[wallet.id] = (eventRows ?? [])
        .filter(row => row.wallet_id === wallet.id && row.date >= from)
        .map(row => ({
          date: row.date,
          amount: Number(row.amount),
          kind: row.type === 'rendimiento' ? 'rendimiento' as const : 'movimiento' as const,
        }))
    }
  }

  // La serie de cotizaciones tiene que llegar hasta lo más viejo que haya que
  // valuar: la compra más antigua o el arranque de la inversión más vieja.
  const oldestValued = [oldestPurchase, oldestBaseline]
    .filter((d): d is string => Boolean(d))
    .sort()[0] ?? null

  const [cryptoPrices, rateHistory] = await Promise.all([
    getCryptoPrices(holdings.map(h => h.price_source).filter((id): id is string => Boolean(id))),
    fetchRateHistory(supabase, oldestValued),
  ])

  return (
    <FinanzasDashboard
      initialWallets={wallets}
      initialCategories={categories}
      initialCategoryLookup={categoryLookup}
      initialMonthSummary={monthSummary}
      initialBudgets={budgets}
      initialGoals={goals}
      initialRecurring={recurring}
      frequentDefaults={defaults}
      initialHoldings={holdings}
      cryptoPrices={Object.fromEntries(cryptoPrices)}
      rateHistory={rateHistory}
      initialInvestmentEvents={investmentEvents}
    />
  )
}
