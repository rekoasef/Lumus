import { accessDaysLeft, accessEndingPhrase, formatAccessDate } from '@/lib/billing/access-ending'
import { todayInArgentina } from './due-notification'
import type { NewNotification } from '@/types/notifications.types'

/**
 * El aviso de que se termina el acceso gratis, como funciones puras.
 *
 * Tres avisos antes del final (los días 25, 28 y 30 de una prueba de 30) y uno
 * cuando ya terminó, por si no entró a verlo. Van por ventanas y no por día
 * exacto: si el cron no corre un día, el aviso sale al siguiente con los días
 * que queden, y la `dedupe_key` hace que cada fase salga una sola vez.
 */

export type AccessNoticePhase = 'faltan5' | 'faltan2' | 'hoy' | 'termino'

/** Hasta cuántos días después del fin se avisa que terminó. */
const ENDED_NOTICE_DAYS = 2

export function accessNoticePhase(daysLeft: number, expired: boolean): AccessNoticePhase | null {
  if (expired) return daysLeft >= -ENDED_NOTICE_DAYS ? 'termino' : null
  if (daysLeft === 0) return 'hoy'
  if (daysLeft >= 1 && daysLeft <= 2) return 'faltan2'
  if (daysLeft >= 3 && daysLeft <= 5) return 'faltan5'
  return null
}

export interface ExpiringGrant {
  user_id: string
  expires_at: string
}

/** Con el cobro apagado no se puede mandar a nadie a pagar: se lo manda a escribir. */
function nextStep(checkoutEnabled: boolean, supportEmail: string): string {
  return checkoutEnabled
    ? 'Suscribite para seguir usando Lumus.'
    : `Escribinos a ${supportEmail} para seguir usando Lumus.`
}

export function buildAccessEndingNotice(
  grant: ExpiringGrant,
  phase: AccessNoticePhase,
  daysLeft: number,
  checkoutEnabled: boolean,
  supportEmail: string,
): NewNotification {
  const expiryDate = todayInArgentina(new Date(grant.expires_at))
  const ended = phase === 'termino'

  return {
    userId: grant.user_id,
    type: 'acceso_por_vencer',
    title: ended
      ? 'Tu acceso gratis a Lumus terminó'
      : `Tu acceso gratis a Lumus ${accessEndingPhrase(daysLeft)}`,
    body: ended
      ? `Todo lo que cargaste sigue guardado. ${nextStep(checkoutEnabled, supportEmail)}`
      : `Vence el ${formatAccessDate(grant.expires_at)}. Tus datos quedan guardados. ${nextStep(checkoutEnabled, supportEmail)}`,
    link: '/suscripcion',
    // La fecha de vencimiento va en la clave: si un admin extiende el acceso,
    // los avisos de la fecha nueva vuelven a salir.
    dedupeKey: `acceso:${expiryDate}:${phase}`,
  }
}

/**
 * Los avisos de hoy. Quien ya se suscribió no recibe nada: su acceso gratis
 * queda de más, pero no se le termina nada.
 */
export function selectAccessEndingNotices(
  grants: readonly ExpiringGrant[],
  subscribedUserIds: ReadonlySet<string>,
  now: Date,
  checkoutEnabled: boolean,
  supportEmail: string,
): NewNotification[] {
  const notices: NewNotification[] = []

  for (const grant of grants) {
    if (subscribedUserIds.has(grant.user_id)) continue

    const daysLeft = accessDaysLeft(grant.expires_at, now)
    const expired = new Date(grant.expires_at).getTime() <= now.getTime()
    const phase = accessNoticePhase(daysLeft, expired)
    if (!phase) continue

    notices.push(buildAccessEndingNotice(grant, phase, daysLeft, checkoutEnabled, supportEmail))
  }

  return notices
}
