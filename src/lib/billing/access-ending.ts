import { daysBetween } from '@/lib/notifications/due-recurring'
import { todayInArgentina } from '@/lib/notifications/due-notification'
import { ACCESS_ENDING_WARNING_DAYS } from './plan'
import { paidAccessEndsAt, type AccessStatus } from './access'

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
  /** `free`: prueba o cortesía con fecha. `paid`: suscripción que no se renueva, con días pagos. */
  reason: 'free' | 'paid'
  daysLeft: number
  endsOn: string
  /** La última semana: el cartel se nota más y ofrece suscribirse. */
  urgent: boolean
}

/**
 * Qué muestra el cartel del dashboard. `null` = no se muestra.
 *
 * Aparece con un acceso gratis que tiene fecha, y siempre (en su versión
 * visible) con una suscripción que ya no se renueva: quien canceló o tuvo un
 * pago rechazado tiene que saber hasta cuándo entra. Una suscripción activa o
 * una cortesía sin vencimiento no tienen nada que avisar.
 */
export function accessBannerState(access: AccessStatus, now: Date = new Date()): AccessBannerState | null {
  if (access.kind === 'paid_period' && access.paidUntil) {
    // La fecha que se muestra es la del corte real, gracia incluida: en los
    // días de gracia, la de pago ya pasó y decir "hasta el 14" el 15 miente.
    const endsAt = paidAccessEndsAt(access.paidUntil)
    return {
      reason: 'paid',
      daysLeft: Math.max(accessDaysLeft(endsAt, now), 0),
      endsOn: formatAccessDate(endsAt),
      urgent: true,
    }
  }

  if (access.kind !== 'free_grant' || !access.grantExpiresAt) return null

  const daysLeft = accessDaysLeft(access.grantExpiresAt, now)
  // Vencido no llega acá (el gate ya lo mandó a /suscripcion), pero si la hora
  // pasó y la fecha no, sigue siendo "hoy".
  if (daysLeft < 0) return null

  return {
    reason: 'free',
    daysLeft,
    endsOn: formatAccessDate(access.grantExpiresAt),
    urgent: daysLeft <= ACCESS_ENDING_WARNING_DAYS,
  }
}
