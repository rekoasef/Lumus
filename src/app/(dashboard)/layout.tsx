import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccessStatus } from '@/lib/billing/access'
import { accessBannerState } from '@/lib/billing/access-ending'
import { AccessEndingBanner } from '@/components/modules/billing/access-ending-banner'
import { needsOnboarding } from '@/lib/auth/onboarding'
import { BottomNav } from '@/components/shared/bottom-nav'
import { TopNav } from '@/components/shared/top-nav'
import { ConfirmDialogProvider } from '@/components/shared/confirm-dialog'
import { FeedbackButton } from '@/components/shared/feedback-button'
import { QuickExpenseProvider } from '@/components/shared/quick-expense'
import { getFrequentDefaults, getWalletsAndCategories } from '@/lib/finance/server-data'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  if (await needsOnboarding(supabase, user.id)) redirect('/onboarding')

  // Suscripción activa o acceso gratis vigente — ver lib/billing/access
  const access = await getAccessStatus(supabase, user.id)
  if (access.kind === 'none') redirect('/suscripcion')
  const banner = accessBannerState(access)

  // Lo que necesita el formulario de carga rápida, más el contador de la
  // campanita. Se pide en el layout porque el botón `+` vive en las dos barras
  // de navegación: si los datos llegaran por página, cargar un gasto solo
  // funcionaría desde algunas.
  //
  // Los dos primeros van cacheados por request: la página que se está
  // renderizando pide lo mismo, y sin `cache()` cada pantalla consultaría
  // billeteras y categorías dos veces. El `count` va con `head: true` — no trae
  // filas, solo el número.
  const [{ wallets, categories }, defaults, unreadRes] = await Promise.all([
    getWalletsAndCategories(user.id),
    getFrequentDefaults(user.id),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
  ])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-72 left-1/4 size-[44rem] rounded-full bg-[#bdb4ff]/[0.055] blur-3xl" />
        <div className="absolute top-24 right-0 size-[32rem] rounded-full bg-[#ffb86e]/[0.035] blur-3xl" />
        <div className="absolute inset-0 lumus-panel-grid opacity-60" />
      </div>

      <TopNav unreadNotifications={unreadRes.count ?? 0} />
      <main className="relative min-h-screen pt-16 pb-24 lg:pb-0">
        {banner && <AccessEndingBanner state={banner} />}
        {children}
      </main>
      <BottomNav />
      <QuickExpenseProvider wallets={wallets} categories={categories} defaults={defaults} />
      <FeedbackButton />
      <ConfirmDialogProvider />
    </div>
  )
}
