import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Client = SupabaseClient<Database>

/**
 * Motivo por el que un usuario tiene (o no) acceso al dashboard.
 *
 * - `subscription`: suscripción de Mercado Pago autorizada.
 * - `paid_period`: canceló o se le pausó, pero todavía está dentro de lo que
 *   pagó (más los días de gracia).
 * - `free_grant`: prueba gratis o cortesía vigente.
 */
export type AccessKind = 'subscription' | 'paid_period' | 'free_grant' | 'none'

export interface AccessStatus {
  kind: AccessKind
  /** Vencimiento del acceso gratis. null = sin vencimiento o no aplica. */
  grantExpiresAt: string | null
  /** Hasta cuándo está pago, cuando el acceso es `paid_period`. */
  paidUntil: string | null
}

/**
 * Días de acceso después de `paid_until`. Mercado Pago reintenta un cobro
 * rechazado durante varios días: sin esto, una tarjeta sin saldo un día te
 * deja afuera de tu propia app mientras el reintento todavía puede salir.
 */
export const PAYMENT_GRACE_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Estados con los que el período ya pagado sigue valiendo. `pending` entra
 * porque es el estado de quien vuelve a suscribirse: arrancar el checkout no
 * puede cortarle los días que ya pagó.
 *
 * Es seguro porque `paid_until` solo lo escribe el webhook después de un pago
 * real: desde 00035 el usuario no puede escribir su fila. Una suscripción que
 * nunca se pagó tiene `paid_until` nulo y no pasa por acá.
 */
const ENDED_STATUSES = new Set(['cancelled', 'paused', 'pending'])

export interface AccessInput {
  subscriptionStatus: string | null
  paidUntil: string | null
  /**
   * Va aparte de `grantExpiresAt` porque `null` ahí significa dos cosas
   * opuestas: sin fila de grant, o grant sin vencimiento.
   */
  hasGrant: boolean
  grantExpiresAt: string | null
}

/** Un grant vence a la fecha indicada; sin fecha, no vence nunca. */
function isGrantActive(expiresAt: string | null, now: Date): boolean {
  return expiresAt === null || new Date(expiresAt).getTime() > now.getTime()
}

/** Cuándo se corta de verdad el acceso de lo pagado: la fecha de pago más la gracia. */
export function paidAccessEndsAt(paidUntil: string): string {
  return new Date(new Date(paidUntil).getTime() + PAYMENT_GRACE_DAYS * DAY_MS).toISOString()
}

/** Si lo pagado (más la gracia) todavía no terminó. */
export function isWithinPaidPeriod(paidUntil: string | null, now: Date): boolean {
  if (!paidUntil) return false
  return new Date(paidAccessEndsAt(paidUntil)).getTime() > now.getTime()
}

/**
 * La regla de acceso, pura. La usan el gate (a través de `getAccessStatus`),
 * `/suscripcion` y el panel de admin, que la aplica a todos los usuarios de una
 * vez: si alguno tuviera su propia copia, podría decir "entra" de alguien que
 * el gate frena.
 */
export function resolveAccessKind(input: AccessInput, now: Date = new Date()): AccessKind {
  if (input.subscriptionStatus === 'authorized') return 'subscription'
  if (
    input.subscriptionStatus !== null
    && ENDED_STATUSES.has(input.subscriptionStatus)
    && isWithinPaidPeriod(input.paidUntil, now)
  ) {
    return 'paid_period'
  }
  if (input.hasGrant && isGrantActive(input.grantExpiresAt, now)) return 'free_grant'
  return 'none'
}

/**
 * Resuelve si un usuario puede entrar al dashboard.
 *
 * Vive acá y no en cada gate a propósito: la regla se chequea en el proxy y
 * de nuevo en el layout del dashboard, y si las dos copias se desincronizan
 * el paywall queda abierto por un lado y cerrado por el otro.
 */
export async function getAccessStatus(supabase: Client, userId: string): Promise<AccessStatus> {
  const [{ data: subscription }, { data: grant }] = await Promise.all([
    supabase
      .from('billing_subscriptions')
      .select('status, paid_until')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('free_access_grants')
      .select('expires_at')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const kind = resolveAccessKind({
    subscriptionStatus: subscription?.status ?? null,
    paidUntil: subscription?.paid_until ?? null,
    hasGrant: grant !== null,
    grantExpiresAt: grant?.expires_at ?? null,
  })

  return {
    kind,
    grantExpiresAt: kind === 'free_grant' ? (grant?.expires_at ?? null) : null,
    paidUntil: kind === 'paid_period' ? (subscription?.paid_until ?? null) : null,
  }
}

export async function hasAccess(supabase: Client, userId: string): Promise<boolean> {
  const { kind } = await getAccessStatus(supabase, userId)
  return kind !== 'none'
}

/**
 * Desde cuándo se le puede cobrar a alguien que se suscribe ahora: cuando se
 * termine lo que ya tiene (la prueba gratis o un período pago). Así, suscribirse
 * el día 10 de la prueba no le hace perder los 20 días que le quedan, y volver
 * a suscribirse después de cancelar no le cobra dos veces el mismo mes.
 *
 * `null` = no tiene nada por delante: se cobra en el momento.
 */
export function firstChargeDate(
  input: { grantExpiresAt: string | null; paidUntil: string | null },
  now: Date = new Date(),
): string | null {
  const candidates = [input.grantExpiresAt, input.paidUntil]
    .filter((date): date is string => date !== null)
    .map(date => new Date(date))
    .filter(date => date.getTime() > now.getTime())

  if (candidates.length === 0) return null
  return new Date(Math.max(...candidates.map(d => d.getTime()))).toISOString()
}
