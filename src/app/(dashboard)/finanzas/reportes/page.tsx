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
  wallet: { currency: string } | null
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const now = new Date()
  const currentYear = now.getFullYear()

  const rawMonth = Number(params.month)
  const rawYear = Number(params.year)
  const selectedMonth = rawMonth >= 1 && rawMonth <= 12 ? rawMonth : now.getMonth() + 1
  const selectedYear = rawYear >= 2020 && rawYear <= currentYear ? rawYear : currentYear

  // 6 meses terminando en el mes seleccionado
  const refDate = new Date(selectedYear, selectedMonth - 1, 1)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1)
    return { month: d.getMonth() + 1, year: d.getFullYear() }
  }).reverse()

  const oldest = months[0]
  const rangeStart = `${oldest.year}-${String(oldest.month).padStart(2, '0')}-01`

  // Último día del mes seleccionado
  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
  const rangeEnd = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data: rawTx } = await supabase
    .from('transactions')
    .select('type, amount, date, category_id, category:finance_categories(id, name, color), wallet:wallets(currency)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('date', rangeStart)
    .lte('date', rangeEnd)
    .in('type', ['gasto', 'ingreso'])

  const transactions = (rawTx ?? []) as unknown as RawTx[]

  // Suma montos por moneda (billetera puede ser ARS o USD) — la conversión
  // a un único total se hace en el cliente con la cotización vigente
  const sumByCurrency = (txs: RawTx[]): Record<string, number> =>
    txs.reduce<Record<string, number>>((acc, t) => {
      const currency = t.wallet?.currency ?? 'ARS'
      acc[currency] = (acc[currency] ?? 0) + Number(t.amount)
      return acc
    }, {})

  // Evolución mensual
  const monthlyEvolution: MonthStat[] = months.map(({ month, year }) => {
    const monthTx = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() + 1 === month && d.getFullYear() === year
    })
    return {
      label: MONTH_ABBR[month - 1],
      gastos:   sumByCurrency(monthTx.filter(t => t.type === 'gasto')),
      ingresos: sumByCurrency(monthTx.filter(t => t.type === 'ingreso')),
    }
  })

  // Gastos del mes seleccionado por categoría
  const currentTx = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && t.type === 'gasto'
  })

  const byCat: Record<string, { name: string; color: string; amounts: Record<string, number> }> = {}
  for (const tx of currentTx) {
    const catId    = tx.category_id    ?? '__none__'
    const catName  = tx.category?.name  ?? 'Sin categoría'
    const catColor = tx.category?.color ?? '#64748b'
    const currency = tx.wallet?.currency ?? 'ARS'
    if (!byCat[catId]) byCat[catId] = { name: catName, color: catColor, amounts: {} }
    byCat[catId].amounts[currency] = (byCat[catId].amounts[currency] ?? 0) + Number(tx.amount)
  }

  const expensesByCategory: CategoryStat[] = Object.entries(byCat)
    .map(([id, data]) => ({ id, ...data }))

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
      monthLabel={`${MONTH_FULL[selectedMonth - 1]} ${selectedYear}`}
      aiReports={aiReports}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
    />
  )
}
