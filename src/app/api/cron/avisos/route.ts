import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { selectDueNotices, type RecurringDue, DUE_SOON_DAYS } from '@/lib/notifications/due-recurring'
import {
  createNotifications,
  markEmailed,
  pendingEmailNotifications,
  usersWithEmailDisabled,
} from '@/lib/notifications/notifications'
import { sendDigestEmail } from '@/lib/notifications/digest-email'
import { buildDueNotification, todayInArgentina } from '@/lib/notifications/due-notification'
import type { NewNotification } from '@/types/notifications.types'

/**
 * Cron diario de avisos.
 *
 * Corre con `service_role` y sin sesión, así que RLS no aplica: el aislamiento
 * entre usuarios lo hace este código, agrupando por `user_id` y mandándole a
 * cada uno solo lo suyo.
 *
 * El plan Hobby de Vercel permite una corrida por día y garantiza la hora
 * dentro de la franja, no el minuto — ver `vercel.json`.
 */

export const dynamic = 'force-dynamic'

/**
 * Sin esto, la URL del cron es un botón público para mandarle mails a todos.
 * Vercel manda `Authorization: Bearer $CRON_SECRET` en cada invocación.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = todayInArgentina()

  // El rango se pide en SQL en vez de traer todos los recurrentes: es el mismo
  // filtro que aplica `selectDueNotices`, solo que antes de la red.
  const horizon = new Date(`${today}T12:00:00Z`)
  horizon.setUTCDate(horizon.getUTCDate() + DUE_SOON_DAYS)
  const horizonDate = horizon.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('id, user_id, description, amount, type, repeat_type, next_date, active')
    .eq('active', true)
    .lte('next_date', horizonDate)

  if (error) {
    console.error('[avisos] no se pudieron leer los recurrentes', error)
    return NextResponse.json({ error: 'Error leyendo vencimientos' }, { status: 500 })
  }

  const recurring = (data ?? []) as RecurringDue[]
  const notices = selectDueNotices(recurring, today)

  // Agrupado explícito por usuario: es lo que reemplaza a RLS acá.
  const byUser = new Map<string, NewNotification[]>()
  for (const notice of notices) {
    const list = byUser.get(notice.recurring.user_id) ?? []
    list.push(buildDueNotification(notice))
    byUser.set(notice.recurring.user_id, list)
  }

  await createNotifications(supabase, [...byUser.values()].flat())

  const unsubscribed = await usersWithEmailDisabled(supabase, 'vencimiento')

  let emailsSent = 0
  let emailsFailed = 0

  for (const userId of byUser.keys()) {
    if (unsubscribed.has(userId)) continue

    // El digest se arma sobre lo pendiente y no sobre lo recién creado: así
    // arrastra lo que ayer no se pudo mandar.
    const pending = await pendingEmailNotifications(supabase, userId)
    if (pending.length === 0) continue

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    const email = userData?.user?.email
    if (userError || !email) {
      console.error('[avisos] sin mail para el usuario', userId, userError)
      emailsFailed++
      continue
    }

    if (await sendDigestEmail(email, userId, pending)) {
      await markEmailed(supabase, userId, pending.map(n => n.id))
      emailsSent++
    } else {
      emailsFailed++
    }
  }

  return NextResponse.json({
    today,
    recurringChecked: recurring.length,
    notices: notices.length,
    usersNotified: byUser.size,
    emailsSent,
    emailsFailed,
  })
}
