import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MetasView } from '@/components/modules/finanzas/metas-view'
import { getWalletsAndCategories } from '@/lib/finance/server-data'
import type { SavingGoal } from '@/types/finance.types'

export default async function MetasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ wallets }, goalsRes] = await Promise.all([
    getWalletsAndCategories(user.id),
    supabase
      .from('saving_goals')
      .select('id, name, target_amount, current_amount, target_date, achieved, icon, created_at, updated_at, saving_goal_wallets(wallet_id)')
      .eq('user_id', user.id)
      .order('achieved', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const goals = ((goalsRes.data ?? []) as unknown as (Omit<SavingGoal, 'wallet_ids'> & { saving_goal_wallets: { wallet_id: string }[] })[])
    .map(({ saving_goal_wallets, ...goal }) => ({ ...goal, wallet_ids: saving_goal_wallets.map(w => w.wallet_id) }))

  return <MetasView initialGoals={goals} wallets={wallets} />
}
