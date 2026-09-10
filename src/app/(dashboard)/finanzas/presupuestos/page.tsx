import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PresupuestosView } from '@/components/modules/finanzas/presupuestos-view'
import { getWalletsAndCategories } from '@/lib/finance/server-data'
import { rawTotalsByCategory } from '@/lib/finance/summary'
import { localDateStr } from '@/lib/utils/format-date'
import type { Budget, FinanceSummaryRow } from '@/types/finance.types'

export default async function PresupuestosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = localDateStr(new Date(year, month, 0))

  const [{ categories }, budgetsRes, summaryRes] = await Promise.all([
    getWalletsAndCategories(user.id),
    supabase
      .from('budgets')
      .select('id, amount, month, year, created_at, category_id, category:finance_categories(id, name, color, icon)')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year)
      .order('created_at', { ascending: true }),
    // Lo gastado por categoría sale del mismo agregado que los KPIs del mes,
    // no de una segunda consulta de filas.
    supabase.rpc('get_finance_summary', { p_from: monthStart, p_to: monthEnd }),
  ])

  const spentByCategory = rawTotalsByCategory(
    (summaryRes.data ?? []) as unknown as FinanceSummaryRow[],
    'gasto',
  )

  const budgets = (budgetsRes.data ?? []).map(b => ({
    ...b,
    spent: spentByCategory[b.category_id] ?? 0,
  })) as Budget[]

  return (
    <PresupuestosView
      initialBudgets={budgets}
      initialCategories={categories}
      initialMonth={month}
      initialYear={year}
    />
  )
}
