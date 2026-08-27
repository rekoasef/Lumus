import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type {
  NewNotification,
  Notification,
  NotificationChannels,
  NotificationType,
} from '@/types/notifications.types'
import { indexPreferences, channelsFor } from './preferences'
import { NOTIFICATION_TYPE_INFO } from '@/types/notifications.types'

/**
 * El motor de avisos: crear, saber a quién no mandarle, y marcar lo enviado.
 *
 * Todo esto corre con `service_role` desde el cron, sin sesión de usuario, así
 * que **RLS no aplica**. El aislamiento entre usuarios lo garantiza el código
 * de acá: cada query filtra por `user_id` de forma explícita.
 */

type ServiceClient = SupabaseClient<Database>

/**
 * Inserta los avisos que todavía no existían y devuelve solo esos.
 *
 * `ignoreDuplicates` sobre el unique `(user_id, dedupe_key)` es lo que hace
 * idempotente al cron: si vuelve a correr el mismo día, el insert no falla y
 * tampoco duplica — simplemente no devuelve nada, y sin avisos nuevos no sale
 * ningún mail.
 */
export async function createNotifications(
  supabase: ServiceClient,
  notifications: readonly NewNotification[],
  preferences: ReadonlyMap<string, NotificationChannels> = new Map(),
): Promise<Notification[]> {
  // Un aviso apagado en los dos canales no se crea: guardarlo para no
  // mostrarlo en ningún lado es basura que después hay que limpiar.
  const wanted = notifications.filter(n => {
    const channels = channelsFor(preferences, n.userId, n.type)
    return channels.inApp || channels.email
  })

  if (wanted.length === 0) return []

  const rows = wanted.map(n => ({
    user_id: n.userId,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
    dedupe_key: n.dedupeKey,
  }))

  const { data, error } = await supabase
    .from('notifications')
    .upsert(rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
    .select('id, user_id, type, title, body, link, dedupe_key, read_at, emailed_at, created_at')

  if (error) throw new Error(`No se pudieron crear los avisos: ${error.message}`)
  return data ?? []
}

/**
 * Las preferencias explícitas de un conjunto de usuarios.
 *
 * Devuelve solo las filas que existen: quién tiene qué por default lo resuelve
 * `channelsFor`, que es puro y está testeado.
 */
export async function loadPreferences(
  supabase: ServiceClient,
  userIds: readonly string[],
): Promise<Map<string, NotificationChannels>> {
  if (userIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('user_id, type, in_app_enabled, email_enabled')
    .in('user_id', [...userIds])

  if (error) throw new Error(`No se pudieron leer las preferencias: ${error.message}`)
  return indexPreferences(data ?? [])
}

/**
 * Los avisos de un usuario que todavía no salieron por mail.
 *
 * Incluye los de días anteriores cuyo envío falló: por eso el digest se arma
 * sobre `emailed_at is null` y no sobre lo que se acaba de crear.
 */
export async function pendingEmailNotifications(
  supabase: ServiceClient,
  userId: string,
  allowedTypes: readonly NotificationType[],
): Promise<Notification[]> {
  if (allowedTypes.length === 0) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, link, dedupe_key, read_at, emailed_at, created_at')
    .eq('user_id', userId)
    .is('emailed_at', null)
    .in('type', [...allowedTypes])
    .order('created_at', { ascending: true })

  if (error) throw new Error(`No se pudieron leer los avisos pendientes: ${error.message}`)
  return data ?? []
}

/**
 * Sella los avisos como enviados.
 *
 * Se llama **después** de que Resend confirmó el envío. Al revés, un fallo del
 * mail dejaría los avisos marcados y el usuario no se enteraría nunca.
 */
export async function markEmailed(
  supabase: ServiceClient,
  userId: string,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return

  const { error } = await supabase
    .from('notifications')
    .update({ emailed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', [...ids])

  if (error) throw new Error(`No se pudo marcar el envío: ${error.message}`)
}

/** Guarda los dos canales de un tipo para un usuario. */
export async function setPreference(
  supabase: ServiceClient,
  userId: string,
  type: NotificationType,
  channels: NotificationChannels,
): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        type,
        in_app_enabled: channels.inApp,
        email_enabled: channels.email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,type' },
    )

  if (error) throw new Error(`No se pudo guardar la preferencia: ${error.message}`)
}

/**
 * Apaga (o vuelve a prender) solo el mail, dejando el in-app como estaba.
 *
 * Lo usa el link de baja del pie de los mails: ahí el usuario está diciendo
 * "no me escribas más", no "no quiero saber nada".
 */
export async function setEmailPreference(
  supabase: ServiceClient,
  userId: string,
  type: NotificationType,
  enabled: boolean,
): Promise<void> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('in_app_enabled')
    .eq('user_id', userId)
    .eq('type', type)
    .maybeSingle()

  await setPreference(supabase, userId, type, {
    inApp: data?.in_app_enabled ?? NOTIFICATION_TYPE_INFO[type].default.inApp,
    email: enabled,
  })
}

/**
 * Borra los avisos viejos.
 *
 * Un centro de notificaciones que acumula dos años de avisos no lo abre nadie,
 * y la tabla crece para siempre por algo que ya no sirve.
 */
export async function deleteOldNotifications(
  supabase: ServiceClient,
  days: number,
): Promise<number> {
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - days)

  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .lt('created_at', cutoff.toISOString())
    .select('id')

  if (error) throw new Error(`No se pudieron borrar los avisos viejos: ${error.message}`)
  return (data ?? []).length
}
