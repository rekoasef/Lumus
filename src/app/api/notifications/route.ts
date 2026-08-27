import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { channelsFor, indexPreferences } from '@/lib/notifications/preferences'
import { NOTIFICATION_TYPES } from '@/types/notifications.types'

/** Cuántos avisos trae el panel. Más que esto no lo lee nadie. */
const FEED_LIMIT = 20

/**
 * El feed del centro de notificaciones.
 *
 * Filtra por las preferencias in-app del momento en vez de guardar el canal en
 * la fila: así, apagar un tipo esconde también lo que ya se había generado, y
 * volver a prenderlo lo recupera.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: prefRows } = await supabase
    .from('notification_preferences')
    .select('user_id, type, in_app_enabled, email_enabled')
    .eq('user_id', user.id)

  const preferences = indexPreferences(prefRows ?? [])
  const visibleTypes = NOTIFICATION_TYPES.filter(
    type => channelsFor(preferences, user.id, type).inApp,
  )

  if (visibleTypes.length === 0) {
    return NextResponse.json({ notifications: [], unread: 0 })
  }

  const [{ data: notifications, error }, { count }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, user_id, type, title, body, link, dedupe_key, read_at, emailed_at, created_at')
      .eq('user_id', user.id)
      .in('type', visibleTypes)
      .order('created_at', { ascending: false })
      .limit(FEED_LIMIT),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('type', visibleTypes)
      .is('read_at', null),
  ])

  if (error) {
    return NextResponse.json({ error: 'Error al cargar los avisos' }, { status: 500 })
  }

  return NextResponse.json({ notifications: notifications ?? [], unread: count ?? 0 })
}
