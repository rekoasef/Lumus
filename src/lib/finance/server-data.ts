import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { FinanceCategory, Wallet } from '@/types/finance.types'
import type { InvestmentEvent } from '@/lib/finance/investment'
import { frequentDefaults, FREQUENT_WINDOW_DAYS, type FrequentDefaults } from '@/lib/finance/frequent-defaults'
import { fetchRateHistory } from '@/lib/finance/rate-history'
import type { DailyRate } from '@/lib/finance/purchasing-power'

const WALLET_COLUMNS =
  'id, name, type, balance, currency, color, icon, investment_baseline, investment_baseline_date, investment_mode, created_at, updated_at'

/**
 * Billeteras y categorías del usuario.
 *
 * Va envuelto en `cache()` de React porque lo piden **dos veces por request**:
 * el layout, para que el botón de carga rápida funcione en cualquier pantalla,
 * y la página, para su propio contenido. `cache()` desduplica dentro del mismo
 * request, así que la base ve una sola consulta. Por eso recibe el `userId` y
 * no el cliente de Supabase: la clave del cache es el argumento, y un cliente
 * nuevo en cada llamada no desduplicaría nada.
 */
export const getWalletsAndCategories = cache(async (userId: string): Promise<{
  wallets: Wallet[]
  categories: FinanceCategory[]
}> => {
  const supabase = await createClient()

  const [walletsRes, categoriesRes] = await Promise.all([
    supabase
      .from('wallets')
      .select(WALLET_COLUMNS)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('finance_categories')
      .select('id, name, type, icon, color, is_default')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true }),
  ])

  return {
    wallets: (walletsRes.data ?? []) as Wallet[],
    categories: (categoriesRes.data ?? []) as FinanceCategory[],
  }
})

/**
 * Aportes, retiros y rendimientos de cada billetera de inversión, más la serie
 * de cotizaciones que hace falta para valuarlos en dólares.
 *
 * Solo cuentan los movimientos posteriores a la línea de base: lo anterior ya
 * está dentro de ese número, y sumarlo de nuevo lo contaría dos veces.
 */
export async function getInvestmentContext(
  userId: string,
  wallets: Wallet[],
  /** Fecha extra que la serie de cotizaciones también tiene que cubrir (la compra más vieja). */
  alsoCover: string | null = null,
): Promise<{ events: Record<string, InvestmentEvent[]>; rateHistory: DailyRate[] }> {
  const supabase = await createClient()

  const investmentWallets = wallets.filter(
    w => w.type === 'inversion' && w.investment_mode !== 'tenencias' && w.investment_baseline_date !== null,
  )

  const oldestBaseline = investmentWallets.reduce<string | null>(
    (oldest, w) => {
      const date = w.investment_baseline_date
      return date && (!oldest || date < oldest) ? date : oldest
    },
    null,
  )

  const events: Record<string, InvestmentEvent[]> = {}

  if (investmentWallets.length > 0 && oldestBaseline) {
    const { data: eventRows } = await supabase
      .from('transactions')
      .select('wallet_id, date, amount, type')
      .eq('user_id', userId)
      .in('type', ['transferencia', 'rendimiento'])
      .in('wallet_id', investmentWallets.map(w => w.id))
      .gte('date', oldestBaseline)
      .is('deleted_at', null)
      .order('date', { ascending: true })

    for (const wallet of investmentWallets) {
      const from = wallet.investment_baseline_date!
      events[wallet.id] = (eventRows ?? [])
        .filter(row => row.wallet_id === wallet.id && row.date >= from)
        .map(row => ({
          date: row.date,
          amount: Number(row.amount),
          kind: row.type === 'rendimiento' ? 'rendimiento' as const : 'movimiento' as const,
        }))
    }
  }

  // La serie tiene que llegar hasta lo más viejo que haya que valuar. Un
  // `limit` fijo dejaba sin rendimiento a cualquier tenencia anterior, en
  // silencio.
  const oldestValued = [alsoCover, oldestBaseline]
    .filter((d): d is string => Boolean(d))
    .sort()[0] ?? null

  const rateHistory = await fetchRateHistory(supabase, oldestValued)

  return { events, rateHistory }
}

/**
 * Categoría y billetera que más usa el usuario, para precargar un gasto nuevo.
 *
 * Cacheado por la misma razón que `getWalletsAndCategories`: lo piden el layout
 * (para el botón `+`) y la pantalla de Movimientos (para su propio formulario).
 */
export const getFrequentDefaults = cache(async (userId: string): Promise<FrequentDefaults> => {
  const supabase = await createClient()

  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - FREQUENT_WINDOW_DAYS)

  const { data } = await supabase
    .from('transactions')
    .select('category_id, wallet_id')
    .eq('user_id', userId)
    .eq('type', 'gasto')
    .is('deleted_at', null)
    .gte('date', windowStart.toISOString().slice(0, 10))
    .order('date', { ascending: false })
    .limit(200)

  return frequentDefaults(data ?? [])
})
