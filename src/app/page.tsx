import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_done')
    .eq('user_id', user.id)
    .single()

  if (!profile?.onboarding_done) redirect('/onboarding')

  redirect('/dashboard')
}
