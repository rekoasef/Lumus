import { formatCurrency } from '@/lib/utils/format-currency'
import type { DueNotice } from './due-recurring'
import type { NewNotification } from '@/types/notifications.types'

/**
 * Convierte un vencimiento en el aviso que lee el usuario.
 *
 * Separado del cron para poder probar los textos sin base ni mails: son lo
 * único que la persona ve, y "Vence en -1 días" es el tipo de error que no se
 * nota hasta que llegó a la bandeja de alguien.
 */

/** Qué día es hoy para el usuario, no para el servidor. */
export function todayInArgentina(now = new Date()): string {
  // en-CA da YYYY-MM-DD, que es el formato que usa `next_date`.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(now)
}

export function dueTiming(daysUntil: number): string {
  if (daysUntil < -1) return `Venció hace ${Math.abs(daysUntil)} días`
  if (daysUntil === -1) return 'Venció ayer'
  if (daysUntil === 0) return 'Vence hoy'
  if (daysUntil === 1) return 'Vence mañana'
  return `Vence en ${daysUntil} días`
}

export function buildDueNotification(notice: DueNotice): NewNotification {
  const { recurring, daysUntil, dedupeKey } = notice
  const name = recurring.description?.trim() || (recurring.type === 'gasto' ? 'Gasto fijo' : 'Ingreso fijo')
  const amount = formatCurrency(recurring.amount, 'ARS', 'rounded')

  return {
    userId: recurring.user_id,
    type: 'vencimiento',
    title: name,
    body: `${dueTiming(daysUntil)} · ${amount}`,
    link: '/finanzas',
    dedupeKey,
  }
}
