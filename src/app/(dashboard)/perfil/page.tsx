import { createClient } from '@/lib/supabase/server'
import { getAccessStatus } from '@/lib/billing/access'
import { ProfileHeader } from '@/components/modules/profile/profile-header'
import { ProfileForm } from '@/components/modules/profile/profile-form'
import { SubscriptionCard } from '@/components/modules/profile/subscription-card'
import { ChangePasswordForm } from '@/components/modules/profile/change-password-form'
import type { BillingSubscription } from '@/types'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: profile }, { data: summary }, { data: subscription }, access] = await Promise.all([
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
    getAccessStatus(supabase, user.id),
  ])

  const resolvedProfile = profile ?? { name: '', occupation: null, birth_date: null, monthly_salary: null }

  return (
    <div className="min-h-screen px-5 py-10 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-[720px]">
        <ProfileHeader
          name={resolvedProfile.name}
          email={user.email!}
          occupation={resolvedProfile.occupation}
          createdAt={user.created_at}
        />

        <div className="mt-2 divide-y divide-white/[0.06]">
          <div className="py-10">
            <ProfileForm
              initialProfile={resolvedProfile}
              initialSummary={summary?.content ?? ''}
            />
          </div>
          <div className="py-10">
            <SubscriptionCard
              subscription={subscription as BillingSubscription | null}
              access={access}
            />
          </div>
          <div className="py-10">
            <ChangePasswordForm email={user.email!} />
          </div>
        </div>
      </div>
    </div>
  )
}
