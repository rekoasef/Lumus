import { createServiceClient } from '@/lib/supabase/service'
import type { AdminFeedbackItem, AdminPlatformStats, AdminUserStats } from '@/types/admin.types'

/** Cuántos reportes de feedback muestra la bandeja. */
const FEEDBACK_INBOX_LIMIT = 20

export interface AdminDashboardData {
  users: AdminUserStats[]
  platform: AdminPlatformStats
  feedback: AdminFeedbackItem[]
}

/**
 * Todo lo que muestra `/admin`, en una sola pasada.
 *
 * Usa `service_role` porque lee datos de todos los usuarios: **solo se llama
 * desde la página de admin, después de `isAdmin`**. Las métricas salen de las
 * funciones de la migración 00030, que devuelven conteos y nunca montos.
 *
 * Tira si algo falla: un panel que muestra ceros cuando la consulta rompió
 * diría "nadie usa Lumus", que es la conclusión más cara de sacar por error.
 */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = createServiceClient()

  const [usersRes, platformRes, feedbackRes] = await Promise.all([
    supabase.rpc('admin_user_stats'),
    supabase.rpc('admin_platform_stats'),
    supabase
      .from('feedback')
      .select('id, user_id, kind, status, message, path, created_at')
      .order('created_at', { ascending: false })
      .limit(FEEDBACK_INBOX_LIMIT),
  ])

  if (usersRes.error) throw new Error(`admin_user_stats: ${usersRes.error.message}`)
  if (platformRes.error) throw new Error(`admin_platform_stats: ${platformRes.error.message}`)
  if (feedbackRes.error) throw new Error(`feedback: ${feedbackRes.error.message}`)

  // El generador tipa las columnas de un `returns table` como no nulas; los
  // `?? null` son para los usuarios sin perfil, sin suscripción o sin grant.
  const users: AdminUserStats[] = (usersRes.data ?? []).map(row => ({
    userId: row.user_id,
    email: row.email,
    name: row.name ?? null,
    createdAt: row.created_at,
    emailConfirmedAt: row.email_confirmed_at ?? null,
    lastSignInAt: row.last_sign_in_at ?? null,
    onboardingDone: row.onboarding_done,
    subscriptionStatus: row.subscription_status ?? null,
    // `grant_reason` es not null en la tabla: si viene nulo, es que no hay fila.
    hasGrant: row.grant_reason !== null,
    grantReason: row.grant_reason ?? null,
    grantExpiresAt: row.grant_expires_at ?? null,
    wallets: row.wallets,
    transactions: row.transactions,
    transactions30d: row.transactions_30d,
    activeDays30d: row.active_days_30d,
    lastTransactionAt: row.last_transaction_at ?? null,
    budgets: row.budgets,
    recurring: row.recurring,
    goals: row.goals,
    loans: row.loans,
    holdings: row.holdings,
    reports: row.reports,
    wealthAnalyses: row.wealth_analyses,
    feedback: row.feedback,
  }))

  const platformRow = platformRes.data?.[0]
  if (!platformRow) throw new Error('admin_platform_stats: no devolvió filas')

  const platform: AdminPlatformStats = {
    // PostgREST puede mandar `numeric` y `bigint` como string.
    dbBytes: Number(platformRow.db_bytes),
    monthlyRevenue: Number(platformRow.monthly_revenue),
    aiCallsMonth: platformRow.ai_calls_month,
    emailsToday: platformRow.emails_today,
    feedbackOpen: platformRow.feedback_open,
  }

  const emailById = new Map(users.map(u => [u.userId, u.email]))
  const feedback: AdminFeedbackItem[] = (feedbackRes.data ?? []).map(f => ({
    id: f.id,
    kind: f.kind,
    status: f.status,
    message: f.message,
    path: f.path,
    createdAt: f.created_at,
    // `user_id` queda en null si se borró la cuenta (ver 00019).
    email: f.user_id ? (emailById.get(f.user_id) ?? null) : null,
  }))

  return { users, platform, feedback }
}
