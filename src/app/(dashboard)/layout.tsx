import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasAccess } from '@/lib/billing/access'
import { BottomNav } from '@/components/shared/bottom-nav'
import { TopNav } from '@/components/shared/top-nav'
import { ConfirmDialogProvider } from '@/components/shared/confirm-dialog'
import { FeedbackButton } from '@/components/shared/feedback-button'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_done')
    .eq('user_id', user.id)
    .single()

  if (!profile?.onboarding_done) redirect('/onboarding')

  // Suscripción activa o acceso de cortesía vigente — ver lib/billing/access
  if (!(await hasAccess(supabase, user.id))) redirect('/suscripcion')

  // El contador sale de acá y no del nav: es un `count` con `head: true`, o
  // sea que no trae filas, y evita que la campanita consulte en cada render.
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-72 left-1/4 size-[44rem] rounded-full bg-[#bdb4ff]/[0.055] blur-3xl" />
        <div className="absolute top-24 right-0 size-[32rem] rounded-full bg-[#ffb86e]/[0.035] blur-3xl" />
        <div className="absolute inset-0 lumus-panel-grid opacity-60" />
      </div>

      <TopNav unreadNotifications={unreadNotifications ?? 0} />
      <main className="relative min-h-screen pt-16 pb-24 lg:pb-0">
        {children}
      </main>
      <BottomNav />
      <FeedbackButton />
      <ConfirmDialogProvider />
    </div>
  )
}
