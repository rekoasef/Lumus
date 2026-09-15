import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin/access'
import { getAdminDashboardData } from '@/lib/admin/server-data'
import { activationFunnel, adminKpis, featureAdoption, rankByUsage, toUserRow } from '@/lib/admin/metrics'
import { AdminKpis } from '@/components/modules/admin/admin-kpis'
import { AdminUserTable } from '@/components/modules/admin/admin-user-table'
import { AdminFunnel } from '@/components/modules/admin/admin-funnel'
import { AdminFeatureAdoption } from '@/components/modules/admin/admin-feature-adoption'
import { AdminPlatformHealth } from '@/components/modules/admin/admin-platform-health'
import { AdminFeedbackInbox } from '@/components/modules/admin/admin-feedback-inbox'
import { AdminInvitePanel } from '@/components/modules/admin/admin-invite-panel'
import { AdminActionLog } from '@/components/modules/admin/admin-action-log'

/**
 * Panel de admin (`G1`). Muestra cuánto se usa Lumus, **no qué hace cada uno con
 * su plata**: las métricas salen de funciones que devuelven conteos y fechas
 * (migración 00030), así que acá no puede aparecer un monto aunque se quiera.
 */
export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Segunda barrera, después del proxy. `notFound` y no un 403: a quien no es
  // admin no hace falta confirmarle que la ruta existe.
  if (!isAdmin(user.id)) notFound()

  const now = new Date()
  const { users, platform, feedback, invites, actions } = await getAdminDashboardData()
  const rows = rankByUsage(users.map(u => toUserRow(u, now)))
  const adoption = featureAdoption(rows)

  return (
    <div className="min-h-screen px-3 py-5 sm:px-5 sm:py-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[1120px] space-y-4 sm:space-y-6">
        <header className="mb-2">
          <p className="lumus-label text-[0.6rem] text-[var(--accent-lumus)]">Panel de admin</p>
          <h1 className="lumus-heading mt-2 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Cómo se está usando Lumus
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Conteos, no montos: acá se ve cuánto usa cada uno la app, nunca qué hace con su plata.
            {' '}<span className="text-[var(--text-muted)]">
              &ldquo;Activo&rdquo; quiere decir que se logueó o cargó un movimiento — abrir la app sin cargar nada todavía no queda registrado.
            </span>
          </p>
        </header>

        <AdminKpis kpis={adminKpis(rows, now)} monthlyRevenue={platform.monthlyRevenue} />

        <AdminUserTable rows={rows} now={now} adminId={user.id} />

        {/* Lo accionable arriba: invitar y responder feedback se hace todas las
            semanas; el embudo y los costos se miran. */}
        <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <AdminInvitePanel invites={invites} />
          <AdminFeedbackInbox items={feedback} now={now} />
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <AdminFunnel steps={activationFunnel(rows)} />
          <AdminFeatureAdoption base={adoption.base} features={adoption.features} />
        </div>

        <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <AdminPlatformHealth platform={platform} />
          <AdminActionLog actions={actions} now={now} />
        </div>
      </div>
    </div>
  )
}
