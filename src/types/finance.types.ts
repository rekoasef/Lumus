export type WalletType = 'efectivo' | 'banco' | 'virtual'
export type TransactionType = 'gasto' | 'ingreso' | 'transferencia' | 'ajuste'
export type CategoryType = 'gasto' | 'ingreso'

export interface Wallet {
  id: string
  user_id: string
  name: string
  type: WalletType
  balance: number
  currency: string
  color: string
  icon: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface FinanceCategory {
  id: string
  user_id: string
  name: string
  type: CategoryType
  icon: string | null
  color: string
  is_default: boolean
}

export interface Transaction {
  id: string
  user_id: string
  wallet_id: string
  category_id: string | null
  type: TransactionType
  amount: number
  description: string | null
  date: string
  auto_classified: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  wallet?: Pick<Wallet, 'id' | 'name' | 'color' | 'currency'>
  category?: Pick<FinanceCategory, 'id' | 'name' | 'color' | 'icon'>
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
  month: number
  year: number
  created_at: string
  category?: Pick<FinanceCategory, 'id' | 'name' | 'color' | 'icon'>
  spent?: number
}

export interface SavingGoal {
  id: string
  user_id: string
  wallet_id: string | null
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  achieved: boolean
  icon: string | null
  created_at: string
  updated_at: string
  progress_pct?: number
}

export interface FinanceReport {
  id: string
  user_id: string
  month: string
  content: string
  created_at: string
}

export type RecurringRepeatType = 'daily' | 'weekly' | 'monthly'

export interface RecurringTransaction {
  id: string
  user_id: string
  wallet_id: string
  category_id: string | null
  type: 'gasto' | 'ingreso'
  amount: number
  description: string | null
  repeat_type: RecurringRepeatType
  repeat_day: number | null
  next_date: string
  active: boolean
  created_at: string
  updated_at: string
  wallet?: Pick<Wallet, 'id' | 'name' | 'color'>
  category?: Pick<FinanceCategory, 'id' | 'name' | 'color' | 'icon'>
}

export type TransactionFilter = {
  type: TransactionType | 'todas'
  category_id: string | null
  wallet_id: string | null
  date_from: string | null
  date_to: string | null
}
