import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FinanzasDashboard } from '@/components/modules/finanzas/finanzas-dashboard'
import type { Wallet, FinanceCategory, Transaction, Budget, Subscription, SavingGoal } from '@/types/finance.types'

export default async function FinanzasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10)

  const [walletsRes, categoriesRes, transactionsRes, budgetsRes, subscriptionsRes, goalsRes] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('finance_categories')
      .select('id, name, type, icon, color, is_default')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true }),
    supabase
      .from('transactions')
      .select(`
        id, wallet_id, category_id, type, amount, description, date, auto_classified, created_at, updated_at,
        wallet:wallets(id, name, color),
        category:finance_categories(id, name, color, icon)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('budgets')
      .select('id, amount, month, year, created_at, category_id, category:finance_categories(id, name, color, icon)')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year)
      .order('created_at', { ascending: true }),
    supabase
      .from('subscriptions')
      .select('id, name, amount, currency, billing_cycle, next_billing, active, icon, wallet_id, created_at, updated_at')
      .eq('user_id', user.id)
      .order('active', { ascending: false })
      .order('name', { ascending: true }),
    supabase
      .from('saving_goals')
      .select('id, name, target_amount, current_amount, target_date, achieved, icon, wallet_id, created_at, updated_at')
      .eq('user_id', user.id)
      .order('achieved', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const wallets = (walletsRes.data ?? []) as Wallet[]
  const categories = (categoriesRes.data ?? []) as FinanceCategory[]
  const transactions = (transactionsRes.data ?? []) as Transaction[]

  const budgetCategoryIds = (budgetsRes.data ?? []).map(b => b.category_id).filter(Boolean)
  let spentByCategory: Record<string, number> = {}

  if (budgetCategoryIds.length > 0) {
    const { data: spentTx } = await supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('user_id', user.id)
      .eq('type', 'gasto')
      .is('deleted_at', null)
      .in('category_id', budgetCategoryIds)
      .gte('date', monthStart)
      .lte('date', monthEnd)

    spentByCategory = (spentTx ?? []).reduce<Record<string, number>>((acc, t) => {
      if (!t.category_id) return acc
      acc[t.category_id] = (acc[t.category_id] ?? 0) + Number(t.amount)
      return acc
    }, {})
  }

  const budgets = (budgetsRes.data ?? []).map(b => ({
    ...b,
    spent: spentByCategory[b.category_id] ?? 0,
  })) as Budget[]

  const subscriptions = (subscriptionsRes.data ?? []) as Subscription[]
  const goals = (goalsRes.data ?? []) as SavingGoal[]

  return (
    <FinanzasDashboard
      initialWallets={wallets}
      initialCategories={categories}
      initialTransactions={transactions}
      initialBudgets={budgets}
      initialSubscriptions={subscriptions}
      initialGoals={goals}
    />
  )
}
