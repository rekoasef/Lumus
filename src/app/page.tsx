import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { needsOnboarding } from '@/lib/auth/onboarding'
import { getPublicRates } from '@/lib/finance/public-rates'
import { LandingNav } from '@/components/modules/landing/landing-nav'
import { LandingHero } from '@/components/modules/landing/landing-hero'
import { ScrollStatement } from '@/components/modules/landing/scroll-statement'
import { ReportShowcase } from '@/components/modules/landing/report-showcase'
import { DevaluationSection } from '@/components/modules/landing/devaluation-section'
import { FeatureGrid } from '@/components/modules/landing/feature-grid'
import {
  FaqSection,
  FinalCta,
  LandingFooter,
  PricingSection,
  StepsSection,
} from '@/components/modules/landing/landing-sections'

export const metadata: Metadata = {
  title: 'Lumus — Gestor de gastos con IA',
  description:
    'Ordená tus gastos y recibí cada mes un informe hecho por inteligencia artificial. Pesos y dólares, presupuestos, vencimientos y metas. 30 días gratis, sin tarjeta.',
  openGraph: {
    title: 'Lumus — Gestor de gastos con IA',
    description: 'Tu plata, por fin clara. Un informe mensual con IA que sabe que tus pesos se devalúan.',
    locale: 'es_AR',
    type: 'website',
  },
}

/**
 * La landing, para quien no tiene sesión. Quien ya entró sigue de largo a la
 * app, como antes.
 */
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    if (await needsOnboarding(supabase, user.id)) redirect('/onboarding')
    redirect('/dashboard')
  }

  const rates = await getPublicRates()

  return (
    <div className="relative overflow-x-clip bg-[var(--bg-base)] text-[var(--text-primary)]">
      <LandingNav />
      <main>
        <LandingHero />
        <ScrollStatement />
        <ReportShowcase />
        <DevaluationSection series={rates.monthly} latest={rates.latest} />
        <FeatureGrid />
        <StepsSection />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}
