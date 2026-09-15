import type { AccessKind } from '@/lib/billing/access'

/**
 * Una fila de `admin_user_stats()` (migración 00030), con los nulos que el
 * generador de tipos no ve: Supabase tipa las columnas de un `returns table`
 * como no nulas, y un usuario sin perfil o sin suscripción las trae en null.
 *
 * Solo conteos y fechas. Si algún día aparece un monto acá, es porque se tocó
 * la frontera de privacidad de `G1` — ver la migración.
 */
export interface AdminUserStats {
  userId: string
  email: string
  name: string | null
  createdAt: string
  emailConfirmedAt: string | null
  lastSignInAt: string | null
  onboardingDone: boolean
  subscriptionStatus: string | null
  hasGrant: boolean
  grantReason: string | null
  grantExpiresAt: string | null
  wallets: number
  transactions: number
  transactions30d: number
  activeDays30d: number
  lastTransactionAt: string | null
  budgets: number
  recurring: number
  goals: number
  loans: number
  holdings: number
  reports: number
  wealthAnalyses: number
  feedback: number
}

export interface AdminPlatformStats {
  dbBytes: number
  /** Lo que Lumus cobra por mes vía Mercado Pago — la única cifra en pesos del panel. */
  monthlyRevenue: number
  aiCallsMonth: number
  emailsToday: number
  feedbackOpen: number
}

/** Qué tan presente está alguien, según lo último que hizo. */
export type EngagementLevel = 'activo' | 'tibio' | 'inactivo' | 'nunca'

export interface AdminUserRow extends AdminUserStats {
  access: AccessKind
  engagement: EngagementLevel
  /** Lo más reciente entre loguearse y crear un movimiento. */
  lastSeenAt: string | null
}

export interface FunnelStep {
  key: string
  label: string
  count: number
}

export interface FeatureAdoption {
  key: string
  label: string
  users: number
}

export interface AdminFeedbackItem {
  id: string
  kind: string
  status: string
  message: string
  path: string | null
  createdAt: string
  email: string | null
}
