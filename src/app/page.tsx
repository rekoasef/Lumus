import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { needsOnboarding } from '@/lib/auth/onboarding'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  if (await needsOnboarding(supabase, user.id)) redirect('/onboarding')

  redirect('/dashboard')
}
