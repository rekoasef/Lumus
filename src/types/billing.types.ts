export type BillingStatus = 'pending' | 'authorized' | 'paused' | 'cancelled'

export interface BillingSubscription {
  id: string
  user_id: string
  mp_preapproval_id: string | null
  status: BillingStatus
  amount: number
  currency: string
  next_payment_date: string | null
  created_at: string
  updated_at: string
}
