import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Goal,
  PiggyBank,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from 'lucide-react'
import { DashboardHero } from '@/components/modules/dashboard/dashboard-hero'
import { DailyGreeting } from '@/components/modules/dashboard/daily-greeting'
import type { FinanceSummaryRow, RecurringRepeatType, TransactionType } from '@/types/finance.types'
import { getExchangeRates, convertToARS } from '@/lib/finance/exchange-rates'
import { countSummary, sumSummary, totalsByCategory } from '@/lib/finance/summary'
import { budgetUsage, monthlyRecurringAmount, savingGoalProgress } from '@/lib/finance/rules'
import { formatCurrency } from '@/lib/utils/format-currency'

/** Movimientos que muestra la tarjeta de "Últimos movimientos". */
const RECENT_TRANSACTIONS = 6

type FinanceTransaction = {
  id: string
  wallet_id: string
  category_id: string | null
  type: TransactionType
  amount: number
  description: string | null
  date: string
  created_at: string
  wallet?: { id: string; name: string; color: string; currency: string } | null
  category?: { id: string; name: string; color: string; icon: string | null } | null
}

type CategorySummary = {
  id: string
  name: string
  color: string
  icon: string | null
}

type WalletSummary = {
  id: string
  name: string
  balance: number
  currency: string
  color: string
}

type BudgetSummary = {
  id: string
  category_id: string
  amount: number
  spent: number
  category?: { id: string; name: string; color: string; icon: string | null } | null
}

type RecurringSummary = {
  id: string
  type: 'gasto' | 'ingreso'
  amount: number
  description: string | null
  repeat_type: RecurringRepeatType
  next_date: string
  active: boolean
  wallet?: { currency: string } | null
}

type SavingGoalSummary = {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  achieved: boolean
  wallet_ids: string[]
}

type RawSavingGoalRow = {
  id: string
  name: string
  target_amount: number | null
  current_amount: number | null
  target_date: string | null
  achieved: boolean | null
  saving_goal_wallets: { wallet_id: string }[] | null
}

/** Desde qué porcentaje un presupuesto entra en el panel de riesgo. */
const BUDGET_RISK_THRESHOLD = 75

function getLocalDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatMoney(n: number, currency = 'ARS') {
  return formatCurrency(n, currency, 'byCurrency')
}

function formatCompactMoney(n: number) {
  return formatCurrency(n, 'ARS', 'compact')
}

function formatDate(date: string | null) {
  if (!date) return 'Sin fecha'
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
}

function getDaysUntil(date: string | null) {
  if (!date) return null
  const today = new Date(`${getLocalDate()}T12:00:00`)
  const target = new Date(`${date}T12:00:00`)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

async function getDashboardData(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = getLocalDate(new Date(year, month, 0))

  const [walletsRes, recentRes, monthSummaryRes, categoriesRes, budgetsRes, recurringRes, goalsRes, rates] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, balance, currency, color')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    // Solo los que se muestran. Antes se traían 400 filas para renderizar 6 y
    // sumar cuatro totales.
    supabase
      .from('transactions')
      .select(`
        id, wallet_id, category_id, type, amount, description, date, created_at,
        wallet:wallets(id, name, color, currency),
        category:finance_categories(id, name, color, icon)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(RECENT_TRANSACTIONS),
    // Los totales del mes, agregados en SQL: no dependen de ningún tope
    supabase.rpc('get_finance_summary', { p_from: monthStart, p_to: monthEnd }),
    // Sin filtrar borradas: un gasto viejo de una categoría borrada conserva
    // su nombre y su color en el radar
    supabase
      .from('finance_categories')
      .select('id, name, color, icon')
      .eq('user_id', userId),
    supabase
      .from('budgets')
      .select('id, amount, category_id, category:finance_categories(id, name, color, icon)')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year),
    supabase
      .from('recurring_transactions')
      .select('id, type, amount, description, repeat_type, next_date, active, wallet:wallets(currency)')
      .eq('user_id', userId)
      .eq('active', true)
      .order('next_date', { ascending: true }),
    supabase
      .from('saving_goals')
      .select('id, name, target_amount, current_amount, target_date, achieved, saving_goal_wallets(wallet_id)')
      .eq('user_id', userId)
      .eq('achieved', false)
      .order('target_date', { ascending: true, nullsFirst: false }),
    getExchangeRates(),
  ])

  const wallets = (walletsRes.data ?? []) as WalletSummary[]
  const recentTransactions = (recentRes.data ?? []) as unknown as FinanceTransaction[]
  const monthSummary = (monthSummaryRes.data ?? []) as unknown as FinanceSummaryRow[]
  const categories = (categoriesRes.data ?? []) as CategorySummary[]
  const rawBudgets = (budgetsRes.data ?? []) as unknown as Omit<BudgetSummary, 'spent'>[]
  const recurring = (recurringRes.data ?? []) as unknown as RecurringSummary[]
  const goals = ((goalsRes.data ?? []) as unknown as RawSavingGoalRow[]).map(goal => ({
    id: goal.id,
    name: goal.name,
    target_amount: Number(goal.target_amount ?? 0),
    current_amount: Number(goal.current_amount ?? 0),
    target_date: goal.target_date,
    achieved: goal.achieved ?? false,
    wallet_ids: (goal.saving_goal_wallets ?? []).map(w => w.wallet_id),
  })) as SavingGoalSummary[]

  // Gasto del mes por categoría, en ARS, del mismo agregado que los KPIs
  const spentByCategory = totalsByCategory(monthSummary, 'gasto', (amount, currency) => convertToARS(amount, currency, rates))
    .reduce<Record<string, number>>((acc, row) => {
      if (row.categoryId) acc[row.categoryId] = row.total
      return acc
    }, {})

  const budgets = rawBudgets.map(b => ({
    ...b,
    spent: spentByCategory[b.category_id] ?? 0,
  })) as BudgetSummary[]

  return { wallets, recentTransactions, monthSummary, categories, budgets, recurring, goals, monthStart, monthEnd, month, year, rates }
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, dashboardData] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('name')
      .eq('user_id', user.id)
      .single(),
    getDashboardData(supabase, user.id),
  ])

  const { wallets, recentTransactions, monthSummary, categories, budgets, recurring, goals, rates } = dashboardData
  const toARS = (amount: number, currency: string) => convertToARS(amount, currency, rates)
  const hasForeignCurrency = wallets.some(w => (w.currency ?? 'ARS') !== 'ARS')

  const firstName = (profileRes.data?.name ?? 'Usuario').split(' ')[0]
  const date = getFormattedDate()
  const today = new Date()
  const daysElapsed = Math.max(1, today.getDate())
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysLeft = Math.max(0, daysInMonth - today.getDate())

  const monthExpenses = sumSummary(monthSummary, 'gasto', toARS)
  const monthIncome = sumSummary(monthSummary, 'ingreso', toARS)
  const expenseCount = countSummary(monthSummary, 'gasto')
  const incomeCount = countSummary(monthSummary, 'ingreso')
  const monthBalance = monthIncome - monthExpenses
  const dailyBurn = monthExpenses / daysElapsed
  const projectedExpenses = dailyBurn * daysInMonth

  const balanceByCurrency = wallets.reduce<Record<string, number>>((acc, wallet) => {
    const currency = wallet.currency ?? 'ARS'
    acc[currency] = (acc[currency] ?? 0) + Number(wallet.balance ?? 0)
    return acc
  }, {})
  const arsBalance = balanceByCurrency.ARS ?? 0
  // Patrimonio total (todas las billeteras, convertidas a ARS) — para que la
  // autonomía compare el gasto total contra la plata total, no solo la de un wallet
  const totalBalanceARS = Object.entries(balanceByCurrency)
    .reduce((sum, [currency, amount]) => sum + toARS(amount, currency), 0)

  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0)
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0)
  const budgetRemaining = totalBudget - totalBudgetSpent
  const totalBudgetUsage = budgetUsage({ amount: totalBudget, spent: totalBudgetSpent }).percent
  const runwayDays = dailyBurn > 0 ? Math.floor(Math.max(0, totalBalanceARS) / dailyBurn) : null

  const categoryById = new Map(categories.map(c => [c.id, c]))
  const categoryTotals = totalsByCategory(monthSummary, 'gasto', toARS).map(row => {
    const category = row.categoryId ? categoryById.get(row.categoryId) : undefined
    return {
      name: category?.name ?? 'Sin categoría',
      color: category?.color ?? '#94a3b8',
      total: row.total,
      count: row.count,
    }
  })

  const budgetRisks = budgets
    .map(b => ({ ...b, usage: budgetUsage(b).percent }))
    .filter(b => b.usage >= BUDGET_RISK_THRESHOLD)
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 4)

  const monthlyFixedExpenses = recurring.filter(r => r.type === 'gasto').reduce(
    (sum, rec) => sum + toARS(monthlyRecurringAmount(Number(rec.amount), rec.repeat_type), rec.wallet?.currency ?? 'ARS'),
    0
  )
  const upcomingRecurring = recurring
    .map(rec => ({ ...rec, daysUntil: getDaysUntil(rec.next_date) }))
    .sort((a, b) => (a.daysUntil ?? 9999) - (b.daysUntil ?? 9999))
    .slice(0, 4)

  const goalsPreview = goals
    .map(goal => {
      const linkedWallets = wallets.filter(w => goal.wallet_ids.includes(w.id))
      const { currentAmount, percent } = savingGoalProgress(goal, linkedWallets, toARS)
      return { ...goal, currentAmount, progress: percent }
    })
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3)

  const statCards = [
    {
      label: 'Saldo ARS',
      value: formatMoney(arsBalance),
      detail: `${wallets.length} billetera${wallets.length === 1 ? '' : 's'}`,
      icon: WalletIcon,
      color: '#bdb4ff',
    },
    {
      label: 'Gastos del mes',
      value: formatMoney(monthExpenses),
      detail: `${expenseCount} movimiento${expenseCount === 1 ? '' : 's'}${hasForeignCurrency ? ' · conv. a ARS' : ''}`,
      icon: TrendingDown,
      color: '#ef4444',
    },
    {
      label: 'Ingresos del mes',
      value: formatMoney(monthIncome),
      detail: `${incomeCount} entrada${incomeCount === 1 ? '' : 's'}${hasForeignCurrency ? ' · conv. a ARS' : ''}`,
      icon: TrendingUp,
      color: '#22c55e',
    },
    {
      label: monthBalance >= 0 ? 'Resto disponible' : 'Déficit mensual',
      value: `${monthBalance >= 0 ? '+' : ''}${formatMoney(monthBalance)}`,
      detail: `${daysLeft} día${daysLeft === 1 ? '' : 's'} para cerrar`,
      icon: CircleDollarSign,
      color: monthBalance >= 0 ? '#22c55e' : '#ef4444',
    },
  ]

  return (
    <div className="relative min-h-screen space-y-4 px-3 py-5 sm:space-y-6 sm:px-5 sm:py-8 lg:px-12 lg:py-12">
      <DailyGreeting firstName={firstName} />
      <DashboardHero firstName={firstName} date={date} />

      <section className="mx-auto grid max-w-[1120px] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, detail, icon: Icon, color }) => (
          <div key={label} className="lumus-glass rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <Icon size={15} style={{ color }} />
              <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{label}</p>
            </div>
            <p className="mt-3 break-words text-xl font-bold leading-tight text-[var(--text-primary)] sm:text-2xl">
              {value}
            </p>
            <p className="mt-1 text-[0.65rem] text-[var(--text-muted)]">{detail}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="lumus-glass rounded-3xl p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">Radar de gastos</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Dónde se está yendo la plata</h2>
            </div>
            <Link
              href="/finanzas"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-[var(--text-muted)] transition-colors hover:border-white/20 hover:text-[var(--text-secondary)]"
            >
              Abrir finanzas <ArrowRight size={12} />
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {categoryTotals.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center">
                <ReceiptText className="mx-auto mb-3 text-[#bdb4ff]" size={24} />
                <p className="text-sm text-[var(--text-secondary)]">Todavía no hay gastos este mes.</p>
              </div>
            ) : (
              categoryTotals.slice(0, 6).map(category => {
                const pct = monthExpenses > 0 ? Math.round((category.total / monthExpenses) * 100) : 0
                return (
                  <div key={category.name}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: category.color, boxShadow: `0 0 10px ${category.color}55` }}
                        />
                        <span className="truncate font-medium text-[var(--text-secondary)]">{category.name}</span>
                      </div>
                      <span className="shrink-0 font-semibold text-[var(--text-primary)]">
                        {formatMoney(category.total)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.055]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: category.color }}
                      />
                    </div>
                    <p className="mt-1 text-[0.62rem] text-[var(--text-muted)]">
                      {pct}% del gasto mensual, {category.count} movimiento{category.count === 1 ? '' : 's'}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="lumus-glass rounded-3xl p-5 sm:p-7">
            <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">Proyección mensual</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[0.65rem] uppercase tracking-wider text-[var(--text-muted)]">Promedio diario</p>
                <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{formatMoney(dailyBurn)}</p>
              </div>
              <div>
                <p className="text-[0.65rem] uppercase tracking-wider text-[var(--text-muted)]">Proyectado</p>
                <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{formatMoney(projectedExpenses)}</p>
              </div>
              <div>
                <p className="text-[0.65rem] uppercase tracking-wider text-[var(--text-muted)]">Presupuesto usado</p>
                <p className="mt-1 text-lg font-bold" style={{ color: totalBudgetUsage >= 100 ? '#ef4444' : '#bdb4ff' }}>
                  {totalBudget > 0 ? `${totalBudgetUsage}%` : 'Sin definir'}
                </p>
              </div>
              <div>
                <p className="text-[0.65rem] uppercase tracking-wider text-[var(--text-muted)]">Autonomía</p>
                <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                  {runwayDays === null ? 'Sin gasto' : `${runwayDays} días`}
                </p>
              </div>
            </div>
            {totalBudget > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-[var(--text-muted)]">
                  <span>Gastado {formatCompactMoney(totalBudgetSpent)}</span>
                  <span>Resta {formatCompactMoney(budgetRemaining)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.055]">
                  <div
                    className="h-full rounded-full bg-[#bdb4ff]"
                    style={{ width: `${Math.min(100, totalBudgetUsage)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="lumus-glass rounded-3xl p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">Fijos</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Gastos fijos: {formatMoney(monthlyFixedExpenses)} por mes
                </p>
              </div>
              <CalendarClock size={20} className="text-[#ffb86e]" />
            </div>
            <div className="mt-5 space-y-3">
              {upcomingRecurring.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No hay pagos fijos activos.</p>
              ) : (
                upcomingRecurring.map(rec => (
                  <div key={rec.id} className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {rec.description || (rec.type === 'gasto' ? 'Gasto fijo' : 'Ingreso fijo')}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {rec.daysUntil === null
                          ? 'Sin fecha'
                          : rec.daysUntil < 0
                            ? `Pendiente hace ${Math.abs(rec.daysUntil)} día${Math.abs(rec.daysUntil) === 1 ? '' : 's'}`
                            : rec.daysUntil === 0
                              ? 'Hoy'
                              : `En ${rec.daysUntil} día${rec.daysUntil === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: rec.type === 'gasto' ? 'var(--danger)' : 'var(--success)' }}
                      >
                        {rec.type === 'gasto' ? '-' : '+'}{formatMoney(rec.amount, rec.wallet?.currency ?? 'ARS')}
                      </p>
                      <p className="text-[0.62rem] text-[var(--text-muted)]">{formatDate(rec.next_date)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-4 xl:grid-cols-3">
        <div className="lumus-glass rounded-3xl p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <AlertTriangle size={17} className="text-[#ffb86e]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Presupuestos en alerta</h2>
          </div>
          <div className="mt-5 space-y-4">
            {budgetRisks.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No hay presupuestos en zona de riesgo.</p>
            ) : (
              budgetRisks.map(budget => (
                <div key={budget.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-[var(--text-secondary)]">
                      {budget.category?.name ?? 'Sin categoría'}
                    </p>
                    <span className="text-xs font-semibold" style={{ color: budget.usage >= 100 ? '#ef4444' : '#ffb86e' }}>
                      {budget.usage}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.055]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, budget.usage)}%`,
                        backgroundColor: budget.usage >= 100 ? '#ef4444' : '#ffb86e',
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[0.62rem] text-[var(--text-muted)]">
                    {formatMoney(budget.spent)} de {formatMoney(budget.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lumus-glass rounded-3xl p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <Goal size={17} className="text-[#22c55e]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Metas de ahorro</h2>
          </div>
          <div className="mt-5 space-y-4">
            {goalsPreview.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No hay metas activas.</p>
            ) : (
              goalsPreview.map(goal => (
                <div key={goal.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-[var(--text-secondary)]">{goal.name}</p>
                    <span className="text-xs font-semibold text-[#22c55e]">{goal.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.055]">
                    <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${goal.progress}%` }} />
                  </div>
                  <p className="mt-1 text-[0.62rem] text-[var(--text-muted)]">
                    {formatMoney(goal.currentAmount)} de {formatMoney(goal.target_amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lumus-glass rounded-3xl p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <PiggyBank size={17} className="text-[#bdb4ff]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Últimos movimientos</h2>
          </div>
          <div className="mt-5 space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No hay movimientos cargados.</p>
            ) : (
              recentTransactions.map(tx => {
                const isExpense = tx.type === 'gasto'
                const isIncome = tx.type === 'ingreso'
                const color = isExpense ? '#ef4444' : isIncome ? '#22c55e' : '#bdb4ff'
                return (
                  <div key={tx.id} className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {tx.description || tx.category?.name || 'Movimiento'}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {tx.category?.name ?? 'Sin categoría'} · {formatDate(tx.date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold" style={{ color }}>
                      {isExpense ? '-' : isIncome ? '+' : ''}{formatMoney(tx.amount, tx.wallet?.currency ?? 'ARS')}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
