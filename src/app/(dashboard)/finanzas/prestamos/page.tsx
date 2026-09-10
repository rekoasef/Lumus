import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PrestamosView } from '@/components/modules/finanzas/prestamos-view'
import { getWalletsAndCategories } from '@/lib/finance/server-data'
import { LOAN_SELECT, loadRepayments } from '@/app/api/finance/loans/shared'
import type { Loan } from '@/lib/finance/loans'

export default async function PrestamosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ wallets, categories }, loansRes] = await Promise.all([
    getWalletsAndCategories(user.id),
    supabase
      .from('loans')
      .select(LOAN_SELECT)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  const loans = (loansRes.data ?? []) as unknown as Loan[]

  // Las devoluciones vienen con los préstamos y no en una segunda pasada del
  // cliente: sin ellas no se puede saber cuánto falta, y una pantalla que
  // primero muestra la deuda entera y después la corrige es peor que una que
  // tarda un poco más.
  const repayments = await loadRepayments(supabase, user.id, loans)

  return (
    <PrestamosView
      initialLoans={loans}
      initialRepayments={repayments}
      initialWallets={wallets}
      categories={categories}
    />
  )
}
