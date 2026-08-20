import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Client = SupabaseClient<Database>

/** Motivo por el que un usuario tiene (o no) acceso al dashboard. */
export type AccessKind = 'subscription' | 'free_grant' | 'none'

export interface AccessStatus {
  kind: AccessKind
  /** Vencimiento del acceso de cortesía. null = sin vencimiento. */
  grantExpiresAt: string | null
}

/** Un grant vence a la fecha indicada; sin fecha, no vence nunca. */
function isGrantActive(expiresAt: string | null): boolean {
  return expiresAt === null || new Date(expiresAt).getTime() > Date.now()
}

/**
 * Resuelve si un usuario puede entrar al dashboard.
 *
 * Dos caminos válidos: suscripción de Mercado Pago activa, o un acceso de
 * cortesía vigente (`free_access_grants`, ver migración 00018).
 *
 * Vive acá y no en cada gate a propósito: la regla se chequea en el proxy y
 * de nuevo en el layout del dashboard, y si las dos copias se desincronizan
 * el paywall queda abierto por un lado y cerrado por el otro.
 */
export async function getAccessStatus(supabase: Client, userId: string): Promise<AccessStatus> {
  const [{ data: subscription }, { data: grant }] = await Promise.all([
    supabase
      .from('billing_subscriptions')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('free_access_grants')
      .select('expires_at')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (subscription?.status === 'authorized') {
    return { kind: 'subscription', grantExpiresAt: null }
  }

  if (grant && isGrantActive(grant.expires_at)) {
    return { kind: 'free_grant', grantExpiresAt: grant.expires_at }
  }

  return { kind: 'none', grantExpiresAt: null }
}

export async function hasAccess(supabase: Client, userId: string): Promise<boolean> {
  const { kind } = await getAccessStatus(supabase, userId)
  return kind !== 'none'
}
