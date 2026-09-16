import { daysBetween } from '@/lib/notifications/due-recurring'
import { todayInArgentina } from '@/lib/notifications/due-notification'
import { ACCESS_ENDING_WARNING_DAYS } from './plan'
import type { AccessStatus } from './access'

/**
 * El fin de un acceso gratis (la prueba de 30 días o una cortesía con fecha),
 * como funciones puras.
 *
 * El cartel del dashboard, `/suscripcion`, `/perfil` y el aviso del cron dicen
 * "te quedan N días": si cada uno contara por su lado, uno diría "mañana"
 * mientras otro dice "hoy". Los días se cuentan en fechas de Argentina, no en
 * horas, porque es lo que entiende quien lo lee.
 */

/** Días de calendario entre hoy y el día que vence. 0 = vence hoy; negativo = ya venció. */
export function accessDaysLeft(expiresAt: string, now: Date = new Date()): number {
  return daysBetween(todayInArgentina(now), todayInArgentina(new Date(expiresAt)))
}

/** `termina hoy` / `termina mañana` / `termina en 5 días` / `terminó`. */
export function accessEndingPhrase(daysLeft: number): string {
  if (daysLeft < 0) return 'terminó'
  if (daysLeft === 0) return 'termina hoy'
  if (daysLeft === 1) return 'termina mañana'
  return `termina en ${daysLeft} días`
}

/** `18 de octubre`, en hora de Argentina. */
export function formatAccessDate(expiresAt: string): string {
  return new Date(expiresAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export interface AccessBannerState {
  daysLeft: number
  endsOn: string
  /** La última semana: el cartel se nota más y ofrece suscribirse. */
  urgent: boolean
}

/**
 * Qué muestra el cartel del dashboard. `null` = no se muestra.
 *
 * Solo aparece con un acceso gratis que tiene fecha. Una suscripción paga o una
 * cortesía sin vencimiento no tienen nada que avisar.
 */
export function accessBannerState(access: AccessStatus, now: Date = new Date()): AccessBannerState | null {
  if (access.kind !== 'free_grant' || !access.grantExpiresAt) return null

  const daysLeft = accessDaysLeft(access.grantExpiresAt, now)
  // Vencido no llega acá (el gate ya lo mandó a /suscripcion), pero si la hora
  // pasó y la fecha no, sigue siendo "hoy".
  if (daysLeft < 0) return null

  return {
    daysLeft,
    endsOn: formatAccessDate(access.grantExpiresAt),
    urgent: daysLeft <= ACCESS_ENDING_WARNING_DAYS,
  }
}
