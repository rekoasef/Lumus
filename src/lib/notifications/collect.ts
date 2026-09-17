import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { NewNotification } from '@/types/notifications.types'
import { getExchangeRates, convertToARS } from '@/lib/finance/exchange-rates'
import { fetchBudgetSpendRows, sumBudgetSpend } from '@/lib/finance/budget-spend-data'
import { selectDueNotices, DUE_SOON_DAYS, type RecurringDue } from './due-recurring'
import { buildLoanDueNotification, selectLoanDueNotices, type LoanDue } from './due-loans'
import { buildDueNotification } from './due-notification'
import { selectAccessEndingNotices, type ExpiringGrant } from './access-ending'
import { CHECKOUT_ENABLED } from '@/lib/billing/plan'
import { SUPPORT_EMAIL } from '@/lib/contact'
import {
  selectBudgetNotices,
  selectGoalNotices,
  selectMonthlyReportNotice,
  selectWeeklyNotice,
  previousPeriod,
  weekWindows,
  addDays,
  type BudgetWithSpend,
  type GoalForNotice,
  type WalletForNotice,
} from './finance-notices'

/**
 * Las consultas que alimentan al cron.
 *
 * Está separado de la ruta para que la ruta sea orquestación y esto sea acceso
 * a datos. Todo corre con `service_role` y sin sesión, así que **RLS no
 * aplica**: cada agrupación por `user_id` de acá es lo que evita que a alguien
 * le llegue el presupuesto de otro.
 */

type ServiceClient = SupabaseClient<Database>

/**
 * Guarda la cotización del día.
 *
 * No genera avisos: aprovecha que el cron ya corre todos los días para llevar
 * la historia que necesita el patrimonio en dólares. Sin esto, Lumus sabría
 * cuánto vale el dólar hoy y nada más.
 *
 * Devuelve si guardó, sin tirar: que falle la cotización no puede dejar sin
 * aviso a un vencimiento.
 */
export async function recordTodayRate(supabase: ServiceClient, today: string): Promise<boolean> {
  try {
    const rates = await getExchangeRates()

    // Si bluelytics no contestó, lo que hay es el valor de respaldo — guardarlo
    // sería ensuciar la serie con un número inventado.
    if (rates.source !== 'live') return false

    const { error } = await supabase
      .from('exchange_rate_history')
      .upsert(
        { date: today, usd: rates.USD, eur: rates.EUR, source: 'bluelytics' },
        { onConflict: 'date' },
      )

    if (error) throw new Error(error.message)
    return true
  } catch (error) {
    console.error('[avisos] no se pudo guardar la cotización del día', error)
    return false
  }
}

export async function collectDueNotices(
  supabase: ServiceClient,
  today: string,
): Promise<NewNotification[]> {
  const horizon = addDays(today, DUE_SOON_DAYS)

  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('id, user_id, description, amount, type, repeat_type, next_date, active')
    .eq('active', true)
    .lte('next_date', horizon)

  if (error) throw new Error(`vencimientos: ${error.message}`)

  return selectDueNotices((data ?? []) as RecurringDue[], today).map(buildDueNotification)
}

/**
 * Cuotas de préstamo que vencen.
 *
 * Sale del mismo motor y con el mismo tipo de aviso que los recurrentes: para
 * quien lo recibe, una cuota que vence es un vencimiento. `next_due_date` la
 * mueve la app al registrar cada pago, y se pone en null cuando el préstamo
 * queda saldado — por eso el filtro alcanza para no avisar de lo que ya está
 * pago.
 */
export async function collectLoanDueNotices(
  supabase: ServiceClient,
  today: string,
): Promise<NewNotification[]> {
  const horizon = addDays(today, DUE_SOON_DAYS)

  const { data, error } = await supabase
    .from('loans')
    .select('id, user_id, counterparty, installment_amount, next_due_date')
    .is('deleted_at', null)
    .not('next_due_date', 'is', null)
    .lte('next_due_date', horizon)

  if (error) throw new Error(`cuotas de préstamo: ${error.message}`)

  return selectLoanDueNotices((data ?? []) as LoanDue[], today).map(buildLoanDueNotification)
}

/**
 * Accesos gratis (la prueba de 30 días o una cortesía con fecha) que se
 * terminan o que terminaron hace poco.
 *
 * La ventana es más ancha que las fases de `access-ending.ts` a propósito: la
 * que decide qué se avisa es la función pura, que está testeada. Esto solo
 * evita traer grants que no pueden tener ningún aviso.
 */
export async function collectAccessEndingNotices(
  supabase: ServiceClient,
  now: Date,
): Promise<NewNotification[]> {
  const from = new Date(now.getTime() - 4 * 86_400_000).toISOString()
  const to = new Date(now.getTime() + 7 * 86_400_000).toISOString()

  const { data: grants, error } = await supabase
    .from('free_access_grants')
    .select('user_id, expires_at')
    .not('expires_at', 'is', null)
    .gte('expires_at', from)
    .lte('expires_at', to)

  if (error) throw new Error(`accesos gratis: ${error.message}`)
  if (!grants?.length) return []

  const { data: subscriptions, error: subError } = await supabase
    .from('billing_subscriptions')
    .select('user_id')
    .eq('status', 'authorized')
    .in('user_id', grants.map(g => g.user_id))

  if (subError) throw new Error(`suscripciones: ${subError.message}`)

  const subscribed = new Set((subscriptions ?? []).map(s => s.user_id))
  const expiring = grants.filter((g): g is ExpiringGrant => g.expires_at !== null)

  return selectAccessEndingNotices(expiring, subscribed, now, CHECKOUT_ENABLED, SUPPORT_EMAIL)
}

export async function collectBudgetNotices(
  supabase: ServiceClient,
  today: string,
): Promise<NewNotification[]> {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  const period = today.slice(0, 7)

  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('user_id, category_id, amount, finance_categories(name)')
    .eq('month', month)
    .eq('year', year)

  if (error) throw new Error(`presupuestos: ${error.message}`)
  if (!budgets?.length) return []

  const monthStart = `${period}-01`
  const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)

  // Mismo cálculo que las pantallas: los gastos en dólares, al blue del día
  // en que se hicieron. Sumados crudos, US$ 120 contaban como $ 120 y el
  // aviso de presupuesto pasado no salía nunca.
  const rows = await fetchBudgetSpendRows(supabase, {
    from: monthStart,
    to: monthEnd,
    categoryIds: [...new Set(budgets.map(b => b.category_id))],
  })
  const spent = await sumBudgetSpend(supabase, rows, monthStart, r => `${r.user_id}::${r.category_id}`)

  const withSpend: BudgetWithSpend[] = budgets.map(budget => ({
    user_id: budget.user_id,
    category_id: budget.category_id,
    category_name: budget.finance_categories?.name ?? 'Sin categoría',
    amount: Number(budget.amount),
    spent: spent[`${budget.user_id}::${budget.category_id}`] ?? 0,
  }))

  return selectBudgetNotices(withSpend, period)
}

export async function collectGoalNotices(supabase: ServiceClient): Promise<NewNotification[]> {
  const { data: goals, error } = await supabase
    .from('saving_goals')
    .select('id, user_id, name, target_amount, current_amount, achieved, saving_goal_wallets(wallet_id)')
    .or('achieved.is.null,achieved.eq.false')

  if (error) throw new Error(`metas: ${error.message}`)
  if (!goals?.length) return []

  const { data: wallets, error: walletError } = await supabase
    .from('wallets')
    .select('id, user_id, balance, currency')
    .is('deleted_at', null)

  if (walletError) throw new Error(`billeteras: ${walletError.message}`)

  const rates = await getExchangeRates()
  const toARS = (amount: number, currency: string) => convertToARS(amount, currency, rates)

  const forNotice: GoalForNotice[] = goals.map(goal => ({
    id: goal.id,
    user_id: goal.user_id,
    name: goal.name,
    target_amount: Number(goal.target_amount ?? 0),
    current_amount: Number(goal.current_amount ?? 0),
    achieved: goal.achieved ?? false,
    wallet_ids: (goal.saving_goal_wallets ?? []).map(w => w.wallet_id),
  }))

  const walletsForNotice: WalletForNotice[] = (wallets ?? []).map(w => ({
    id: w.id,
    user_id: w.user_id,
    balance: Number(w.balance ?? 0),
    currency: w.currency ?? 'ARS',
  }))

  return selectGoalNotices(forNotice, walletsForNotice, toARS)
}

export async function collectMonthlyReportNotices(
  supabase: ServiceClient,
  today: string,
): Promise<NewNotification[]> {
  const period = previousPeriod(today)
  const from = `${period}-01`
  const to = addDays(`${today.slice(0, 7)}-01`, -1)

  const { data: tx, error } = await supabase
    .from('transactions')
    .select('user_id')
    .is('deleted_at', null)
    .gte('date', from)
    .lte('date', to)

  if (error) throw new Error(`movimientos del mes anterior: ${error.message}`)

  const counts = new Map<string, number>()
  for (const row of tx ?? []) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1)
  }
  if (counts.size === 0) return []

  // Si el reporte ya existe, mandar a generarlo es mandar a una pantalla que
  // ya está llena.
  const { data: existing } = await supabase
    .from('finance_reports')
    .select('user_id')
    .eq('month', period)
    .in('user_id', [...counts.keys()])

  const alreadyGenerated = new Set((existing ?? []).map(r => r.user_id))

  return [...counts.entries()]
    .filter(([userId]) => !alreadyGenerated.has(userId))
    .map(([userId, count]) => selectMonthlyReportNotice(userId, period, count))
    .filter((notice): notice is NewNotification => notice !== null)
}

export async function collectWeeklyNotices(
  supabase: ServiceClient,
  today: string,
): Promise<NewNotification[]> {
  const { current, previous } = weekWindows(today)
  const oldest = previous[previous.length - 1].from

  const { data: tx, error } = await supabase
    .from('transactions')
    .select('user_id, amount, date')
    .eq('type', 'gasto')
    .is('deleted_at', null)
    .gte('date', oldest)
    .lte('date', current.to)

  if (error) throw new Error(`gastos de la semana: ${error.message}`)
  if (!tx?.length) return []

  const byUser = new Map<string, { current: number; previous: number[] }>()

  for (const row of tx) {
    const bucket = byUser.get(row.user_id) ?? { current: 0, previous: [0, 0, 0, 0] }
    const amount = Number(row.amount)

    if (row.date >= current.from && row.date <= current.to) {
      bucket.current += amount
    } else {
      const index = previous.findIndex(w => row.date >= w.from && row.date <= w.to)
      if (index >= 0) bucket.previous[index] += amount
    }

    byUser.set(row.user_id, bucket)
  }

  return [...byUser.entries()]
    .map(([userId, totals]) => selectWeeklyNotice(userId, current.from, totals.current, totals.previous))
    .filter((notice): notice is NewNotification => notice !== null)
}
