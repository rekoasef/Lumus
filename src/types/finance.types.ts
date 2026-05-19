export type WalletType = 'efectivo' | 'banco' | 'virtual'
export type TransactionType = 'gasto' | 'ingreso' | 'transferencia'
export type CategoryType = 'gasto' | 'ingreso'
export type BillingCycle = 'mensual' | 'anual' | 'semanal'

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
  wallet?: Pick<Wallet, 'id' | 'name' | 'color'>
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

export interface Subscription {
  id: string
  user_id: string
  wallet_id: string | null
  name: string
  amount: number
  currency: string
  billing_cycle: BillingCycle
  next_billing: string | null
  active: boolean
  icon: string | null
  created_at: string
  updated_at: string
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

export type TransactionFilter = {
  type: TransactionType | 'todas'
  category_id: string | null
  wallet_id: string | null
  date_from: string | null
  date_to: string | null
}
