import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOnboardingStatus } from '@/lib/auth/onboarding'

/**
 * La guardia que le faltaba al onboarding.
 *
 * Era la única pantalla del gate sin una: se entraba y no había forma de
 * salir, porque el proxy exime a `/onboarding` del chequeo justamente para no
 * dejar a nadie encerrado afuera. Resultado: un redirect equivocado —o uno
 * viejo cacheado por el navegador— te dejaba acá para siempre.
 *
 * Solo `pending` ve el formulario. Con el onboarding ya hecho se vuelve al
 * dashboard, y ante una lectura fallida (`unknown`) también: el último paso
 * hace un `upsert` y completarlo "para poder entrar" te pisa el nombre, la
 * fecha de nacimiento, la ocupación y el sueldo. Ante la duda, no dejar que
 * nadie se sobrescriba los datos.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if ((await getOnboardingStatus(supabase, user.id)) !== 'pending') redirect('/dashboard')

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--bg-base)]">
      <div className="pointer-events-none absolute inset-0 lumus-panel-grid opacity-45" />
      <div className="pointer-events-none absolute -top-64 right-1/4 size-[42rem] rounded-full bg-[#bdb4ff]/[0.07] blur-3xl" />
      {children}
    </div>
  )
}
