import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportsDashboard } from '@/components/modules/finanzas/reports-dashboard'
import type { CategoryStat, MonthStat } from '@/components/modules/finanzas/reports-dashboard'
import type { FinanceReport } from '@/types/finance.types'

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTH_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

type RawTx = {
  type: string
  amount: number
  date: string
  category_id: string | null
  category: { id: string; name: string; color: string } | null
}

export default async function ReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Últimos 6 meses incluyendo el actual
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i)
    return { month: d.getMonth() + 1, year: d.getFullYear() }
  }).reverse()

  const oldest = months[0]
  const rangeStart = `${oldest.year}-${String(oldest.month).padStart(2, '0')}-01`
  const rangeEnd = now.toISOString().slice(0, 10)

  const { data: rawTx } = await supabase
    .from('transactions')
    .select('type, amount, date, category_id, category:finance_categories(id, name, color)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('date', rangeStart)
    .lte('date', rangeEnd)
    .in('type', ['gasto', 'ingreso'])

  const transactions = (rawTx ?? []) as unknown as RawTx[]

  // Evolución mensual
  const monthlyEvolution: MonthStat[] = months.map(({ month, year }) => {
    const monthTx = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() + 1 === month && d.getFullYear() === year
    })
    return {
      label: MONTH_ABBR[month - 1],
      gastos:   monthTx.filter(t => t.type === 'gasto')   .reduce((s, t) => s + Number(t.amount), 0),
      ingresos: monthTx.filter(t => t.type === 'ingreso') .reduce((s, t) => s + Number(t.amount), 0),
    }
  })

  // Gastos del mes actual por categoría
  const currentTx = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear && t.type === 'gasto'
  })

  const byCat: Record<string, { name: string; color: string; amount: number }> = {}
  for (const tx of currentTx) {
    const catId    = tx.category_id    ?? '__none__'
    const catName  = tx.category?.name  ?? 'Sin categoría'
    const catColor = tx.category?.color ?? '#64748b'
    if (!byCat[catId]) byCat[catId] = { name: catName, color: catColor, amount: 0 }
    byCat[catId].amount += Number(tx.amount)
  }

  const totalExpenses = Object.values(byCat).reduce((s, c) => s + c.amount, 0)
  const expensesByCategory: CategoryStat[] = Object.entries(byCat)
    .map(([id, data]) => ({
      id,
      ...data,
      pct: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  const current = monthlyEvolution[monthlyEvolution.length - 1]
  const currentMonthStats = {
    gastos:   current?.gastos   ?? 0,
    ingresos: current?.ingresos ?? 0,
    balance:  (current?.ingresos ?? 0) - (current?.gastos ?? 0),
  }

  const { data: aiReportsData } = await supabase
    .from('finance_reports')
    .select('id, user_id, month, content, created_at')
    .eq('user_id', user.id)
    .order('month', { ascending: false })
    .limit(24)

  const aiReports = (aiReportsData ?? []) as FinanceReport[]

  return (
    <ReportsDashboard
      expensesByCategory={expensesByCategory}
      monthlyEvolution={monthlyEvolution}
      currentMonth={currentMonthStats}
      monthLabel={`${MONTH_FULL[currentMonth - 1]} ${currentYear}`}
      aiReports={aiReports}
    />
  )
}
