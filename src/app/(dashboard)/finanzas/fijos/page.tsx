import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FijosView } from '@/components/modules/finanzas/fijos-view'
import { getWalletsAndCategories } from '@/lib/finance/server-data'
import type { RecurringTransaction } from '@/types/finance.types'

export default async function FijosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ wallets, categories }, recurringRes] = await Promise.all([
    getWalletsAndCategories(user.id),
    supabase
      .from('recurring_transactions')
      .select(`id, wallet_id, category_id, type, amount, description, repeat_type, repeat_day, next_date, active, created_at, updated_at, wallet:wallets(id, name, color), category:finance_categories(id, name, color, icon)`)
      .eq('user_id', user.id)
      .order('next_date', { ascending: true }),
  ])

  return (
    <FijosView
      initialRecurring={(recurringRes.data ?? []) as RecurringTransaction[]}
      wallets={wallets}
      categories={categories}
    />
  )
}
