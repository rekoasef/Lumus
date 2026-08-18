import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/modules/profile/profile-form'
import { SubscriptionCard } from '@/components/modules/profile/subscription-card'
import { ChangePasswordForm } from '@/components/modules/profile/change-password-form'
import type { BillingSubscription } from '@/types'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: profile }, { data: summary }, { data: subscription }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('name, occupation, monthly_salary, birth_date')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('user_life_summary')
      .select('content')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('billing_subscriptions')
      .select('id, user_id, mp_preapproval_id, status, amount, currency, next_payment_date, created_at, updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return (
    <div className="min-h-screen px-5 py-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[720px]">
        <header className="mb-9">
          <p className="lumus-label text-[#cfc6ff]">Cuenta</p>
          <h1 className="lumus-heading mt-4 text-4xl font-bold text-[var(--text-primary)] md:text-5xl">
            Tu cuenta
          </h1>
          <p className="mt-4 text-base text-[var(--text-secondary)]">{user.email}</p>
        </header>

        <div className="space-y-7">
          <ProfileForm
            initialProfile={profile ?? { name: '', occupation: null, birth_date: null, monthly_salary: null }}
            initialSummary={summary?.content ?? ''}
          />

          <SubscriptionCard subscription={subscription as BillingSubscription | null} />

          <ChangePasswordForm email={user.email!} />
        </div>
      </div>
    </div>
  )
}
