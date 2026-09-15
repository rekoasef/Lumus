import { resolveAccessKind } from '@/lib/billing/access'
import type {
  AdminUserRow,
  AdminUserStats,
  EngagementLevel,
  FeatureAdoption,
  FunnelStep,
} from '@/types/admin.types'

/**
 * Las reglas del panel de admin, puras. La base entrega conteos (migración
 * 00030) y acá se decide qué significan: quién está activo, dónde se traba la
 * gente, qué feature no toca nadie.
 *
 * Una salvedad que atraviesa todo el archivo: hasta la etapa 2 de `G1` no hay
 * registro de visitas. "Activo" significa **se logueó o creó un movimiento**;
 * alguien que abre la app todos los días con la sesión guardada y no carga nada
 * figura como inactivo.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Hasta cuántos días desde lo último que hizo alguien cuenta como activo. */
export const ACTIVE_WITHIN_DAYS = 7
/** Pasado esto, deja de ser "tibio" y pasa a inactivo. */
export const WARM_WITHIN_DAYS = 30
/** Un acceso de cortesía que vence dentro de este plazo se marca en el panel. */
export const GRANT_EXPIRY_WARNING_DAYS = 14

/** Tope diario de mails del plan free de Resend. */
export const RESEND_DAILY_EMAIL_LIMIT = 100
/** Tamaño máximo de la base en el plan free de Supabase. */
export const SUPABASE_FREE_DB_BYTES = 500 * 1024 * 1024

export function daysSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS)
}

function latest(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b
}

export function engagementLevel(lastSeenAt: string | null, now: Date): EngagementLevel {
  if (!lastSeenAt) return 'nunca'
  const days = daysSince(lastSeenAt, now)
  if (days <= ACTIVE_WITHIN_DAYS) return 'activo'
  if (days <= WARM_WITHIN_DAYS) return 'tibio'
  return 'inactivo'
}

export function toUserRow(stats: AdminUserStats, now: Date): AdminUserRow {
  const lastSeenAt = latest(stats.lastSignInAt, stats.lastTransactionAt)
  return {
    ...stats,
    access: resolveAccessKind(stats.subscriptionStatus, stats.hasGrant, stats.grantExpiresAt, now),
    engagement: engagementLevel(lastSeenAt, now),
    lastSeenAt,
  }
}

/**
 * Quién la usa más: días con actividad en el último mes, y a igualdad, cuánto
 * cargó. Días primero porque 30 movimientos en una tarde de puesta al día dicen
 * menos del hábito que uno por día durante tres semanas.
 */
export function rankByUsage(rows: readonly AdminUserRow[]): AdminUserRow[] {
  return [...rows].sort((a, b) =>
    b.activeDays30d - a.activeDays30d
    || b.transactions30d - a.transactions30d
    || (b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0) - (a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0),
  )
}

/**
 * El camino de registro a hábito. Es acumulativo a propósito: cada paso cuenta
 * solo a quien pasó los anteriores, así la caída entre dos pasos es gente que
 * se trabó justo ahí. Si no lo fuera, alguien con billetera pero con el acceso
 * vencido haría subir un paso por encima del anterior.
 */
export function activationFunnel(rows: readonly AdminUserRow[]): FunnelStep[] {
  const steps: { key: string; label: string; passes: (r: AdminUserRow) => boolean }[] = [
    { key: 'registered', label: 'Se registró', passes: () => true },
    { key: 'verified', label: 'Verificó el mail', passes: r => r.emailConfirmedAt !== null },
    { key: 'onboarding', label: 'Terminó el onboarding', passes: r => r.onboardingDone },
    { key: 'access', label: 'Tiene acceso', passes: r => r.access !== 'none' },
    { key: 'wallet', label: 'Creó una billetera', passes: r => r.wallets > 0 },
    { key: 'transaction', label: 'Cargó un movimiento', passes: r => r.transactions > 0 },
    { key: 'active', label: 'Activo esta semana', passes: r => r.engagement === 'activo' },
  ]

  let remaining = [...rows]
  return steps.map(step => {
    remaining = remaining.filter(step.passes)
    return { key: step.key, label: step.label, count: remaining.length }
  })
}

/**
 * Cuántos usan cada feature, sobre quienes ya cargaron algo. Billeteras y
 * movimientos no están porque son el piso: sin eso no hay app.
 */
export function featureAdoption(rows: readonly AdminUserRow[]): { base: number; features: FeatureAdoption[] } {
  const activated = rows.filter(r => r.transactions > 0)
  const features: { key: string; label: string; uses: (r: AdminUserRow) => boolean }[] = [
    { key: 'budgets', label: 'Presupuestos', uses: r => r.budgets > 0 },
    { key: 'recurring', label: 'Fijos', uses: r => r.recurring > 0 },
    { key: 'goals', label: 'Metas', uses: r => r.goals > 0 },
    { key: 'loans', label: 'Préstamos', uses: r => r.loans > 0 },
    { key: 'holdings', label: 'Inversiones', uses: r => r.holdings > 0 },
    { key: 'reports', label: 'Reporte con IA', uses: r => r.reports > 0 },
    { key: 'wealth', label: 'Análisis de patrimonio', uses: r => r.wealthAnalyses > 0 },
    { key: 'feedback', label: 'Mandó feedback', uses: r => r.feedback > 0 },
  ]

  return {
    base: activated.length,
    features: features
      .map(f => ({ key: f.key, label: f.label, users: activated.filter(f.uses).length }))
      .sort((a, b) => b.users - a.users),
  }
}

export interface AdminKpis {
  totalUsers: number
  active7d: number
  active30d: number
  newThisWeek: number
  paying: number
  courtesy: number
  blocked: number
  /** Accesos de cortesía que vencen pronto: gente que va a caer en el paywall. */
  grantsExpiringSoon: number
}

export function adminKpis(rows: readonly AdminUserRow[], now: Date): AdminKpis {
  return {
    totalUsers: rows.length,
    active7d: rows.filter(r => r.engagement === 'activo').length,
    active30d: rows.filter(r => r.engagement === 'activo' || r.engagement === 'tibio').length,
    newThisWeek: rows.filter(r => daysSince(r.createdAt, now) < ACTIVE_WITHIN_DAYS).length,
    paying: rows.filter(r => r.access === 'subscription').length,
    courtesy: rows.filter(r => r.access === 'free_grant').length,
    blocked: rows.filter(r => r.access === 'none').length,
    grantsExpiringSoon: rows.filter(r =>
      r.access === 'free_grant'
      && r.grantExpiresAt !== null
      && new Date(r.grantExpiresAt).getTime() - now.getTime() <= GRANT_EXPIRY_WARNING_DAYS * DAY_MS,
    ).length,
  }
}

/** Qué fracción de un tope se usó, acotada a [0, 1] para dibujar la barra. */
export function usageRatio(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(1, Math.max(0, used / limit))
}
