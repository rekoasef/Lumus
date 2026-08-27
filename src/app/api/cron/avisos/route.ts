import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  createNotifications,
  deleteOldNotifications,
  loadPreferences,
  markEmailed,
  pendingEmailNotifications,
} from '@/lib/notifications/notifications'
import { sendDigestEmail } from '@/lib/notifications/digest-email'
import { todayInArgentina } from '@/lib/notifications/due-notification'
import { isFirstOfMonth, isMonday } from '@/lib/notifications/finance-notices'
import { channelsFor } from '@/lib/notifications/preferences'
import {
  collectBudgetNotices,
  collectDueNotices,
  collectGoalNotices,
  collectMonthlyReportNotices,
  collectWeeklyNotices,
} from '@/lib/notifications/collect'
import { NOTIFICATION_TYPES, type NewNotification, type NotificationType } from '@/types/notifications.types'

/**
 * Cron diario de avisos.
 *
 * Corre con `service_role` y sin sesión, así que RLS no aplica: el aislamiento
 * entre usuarios lo hace este código y las agrupaciones de `collect.ts`.
 *
 * El plan Hobby de Vercel permite una corrida por día y garantiza la hora
 * dentro de la franja, no el minuto — ver `vercel.json`. Todo lo que Lumus
 * manda sale de acá, junto, una vez por día: es lo que hace tolerable que un
 * mes activo genere quince avisos.
 */

export const dynamic = 'force-dynamic'

/** Los avisos de más de esto se borran solos. */
const RETENTION_DAYS = 90

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

  const collected: NewNotification[] = []
  const failures: string[] = []

  // Cada colector va por separado: que falle el de metas no puede dejar sin
  // aviso a un vencimiento, que es el que tiene fecha.
  const collectors: [string, () => Promise<NewNotification[]>][] = [
    ['vencimientos', () => collectDueNotices(supabase, today)],
    ['presupuestos', () => collectBudgetNotices(supabase, today)],
    ['metas', () => collectGoalNotices(supabase)],
  ]

  if (isFirstOfMonth(today)) {
    collectors.push(['reporte mensual', () => collectMonthlyReportNotices(supabase, today)])
  }
  if (isMonday(today)) {
    collectors.push(['resumen semanal', () => collectWeeklyNotices(supabase, today)])
  }

  for (const [name, run] of collectors) {
    try {
      collected.push(...await run())
    } catch (error) {
      console.error(`[avisos] falló el colector de ${name}`, error)
      failures.push(name)
    }
  }

  const userIds = [...new Set(collected.map(n => n.userId))]
  const preferences = await loadPreferences(supabase, userIds)

  const created = await createNotifications(supabase, collected, preferences)
  const usersWithNews = [...new Set(created.map(n => n.user_id))]

  let emailsSent = 0
  let emailsFailed = 0

  for (const userId of usersWithNews) {
    const allowedTypes = NOTIFICATION_TYPES.filter(
      (type: NotificationType) => channelsFor(preferences, userId, type).email,
    )

    // El digest se arma sobre lo pendiente y no sobre lo recién creado: así
    // arrastra lo que ayer no se pudo mandar.
    const pending = await pendingEmailNotifications(supabase, userId, allowedTypes)
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

  const deleted = await deleteOldNotifications(supabase, RETENTION_DAYS)

  return NextResponse.json({
    today,
    collected: collected.length,
    created: created.length,
    usersNotified: usersWithNews.length,
    emailsSent,
    emailsFailed,
    deleted,
    failures,
  })
}
