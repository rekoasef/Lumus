import {
  NOTIFICATION_TYPE_INFO,
  NOTIFICATION_TYPES,
  type NotificationChannels,
  type NotificationType,
} from '@/types/notifications.types'

/**
 * Resolución de preferencias, como función pura.
 *
 * La regla que hay que tener clara: **la ausencia de fila no es "apagado", es
 * "lo que diga el default de ese tipo"**. Por eso el resumen semanal arranca
 * apagado para todos sin necesidad de sembrarle una fila a nadie, y un tipo
 * nuevo aparece prendido sin migrar datos.
 */

export interface PreferenceRow {
  type: string
  in_app_enabled: boolean
  email_enabled: boolean
}

/** Clave de la tabla de preferencias resueltas. */
export function preferenceKey(userId: string, type: NotificationType): string {
  return `${userId}::${type}`
}

export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value)
}

export function channelsFor(
  explicit: ReadonlyMap<string, NotificationChannels>,
  userId: string,
  type: NotificationType,
): NotificationChannels {
  const info = NOTIFICATION_TYPE_INFO[type]

  // Un aviso que no se puede apagar ignora lo que diga la fila: si no llega,
  // el usuario pierde algo sin enterarse de por qué.
  if (!info.canDisable) return { inApp: true, email: true }

  return explicit.get(preferenceKey(userId, type)) ?? info.default
}

/** Arma el mapa de preferencias explícitas a partir de las filas de la base. */
export function indexPreferences(
  rows: readonly (PreferenceRow & { user_id: string })[],
): Map<string, NotificationChannels> {
  const map = new Map<string, NotificationChannels>()

  for (const row of rows) {
    if (!isNotificationType(row.type)) continue
    map.set(preferenceKey(row.user_id, row.type), {
      inApp: row.in_app_enabled,
      email: row.email_enabled,
    })
  }

  return map
}

/** Las preferencias de un usuario para todos los tipos, con defaults aplicados. */
export function allChannelsFor(
  explicit: ReadonlyMap<string, NotificationChannels>,
  userId: string,
): Record<NotificationType, NotificationChannels> {
  return Object.fromEntries(
    NOTIFICATION_TYPES.map(type => [type, channelsFor(explicit, userId, type)]),
  ) as Record<NotificationType, NotificationChannels>
}
