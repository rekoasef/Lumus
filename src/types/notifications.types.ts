import type { Database } from './database.types'

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']

/**
 * Tipos de aviso que entiende el motor.
 *
 * Sumar uno acá implica también el `check` de la migración y su default en
 * `notification_preferences` — están atados a propósito: un tipo que la base
 * no conoce se rechaza en el insert en vez de mandarse mal.
 */
export const NOTIFICATION_TYPES = ['vencimiento'] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface NewNotification {
  userId: string
  type: NotificationType
  title: string
  body?: string | null
  /** Ruta relativa dentro de la app. */
  link?: string | null
  dedupeKey: string
}
