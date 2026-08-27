import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { NewNotification, Notification, NotificationType } from '@/types/notifications.types'

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
): Promise<Notification[]> {
  if (notifications.length === 0) return []

  const rows = notifications.map(n => ({
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
 * Quiénes se dieron de baja de este tipo de aviso.
 *
 * La ausencia de fila significa activado, así que esto devuelve solo a los que
 * dijeron que no explícitamente.
 */
export async function usersWithEmailDisabled(
  supabase: ServiceClient,
  type: NotificationType,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .eq('type', type)
    .eq('email_enabled', false)

  if (error) throw new Error(`No se pudieron leer las preferencias: ${error.message}`)
  return new Set((data ?? []).map(row => row.user_id))
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
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, link, dedupe_key, read_at, emailed_at, created_at')
    .eq('user_id', userId)
    .is('emailed_at', null)
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

/** Apaga (o vuelve a prender) los mails de un tipo para un usuario. */
export async function setEmailPreference(
  supabase: ServiceClient,
  userId: string,
  type: NotificationType,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: userId, type, email_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,type' },
    )

  if (error) throw new Error(`No se pudo guardar la preferencia: ${error.message}`)
}
