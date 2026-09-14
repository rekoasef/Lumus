import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Client = SupabaseClient<Database>

/**
 * En qué estado está el onboarding de un usuario.
 *
 * `unknown` no es un detalle: es el estado que faltaba. Ver abajo.
 */
export type OnboardingStatus = 'done' | 'pending' | 'unknown'

/**
 * Si el usuario ya hizo el onboarding.
 *
 * ── Por qué existe `unknown` ──
 *
 * Los tres gates preguntaban esto así:
 *
 *     const { data: profile } = await supabase.from('user_profiles')...
 *     if (!profile?.onboarding_done) redirect('/onboarding')
 *
 * El `error` no se miraba nunca, así que **"no pude leer el perfil" quedaba
 * indistinguible de "no hizo el onboarding"**. Un arranque en frío, un timeout
 * o un hipo de Supabase mandaban al onboarding a alguien que lo había hecho
 * hace meses (pasó el 2026-09-14, en producción, con el dueño del proyecto).
 *
 * Y la consecuencia es cara: el último paso del onboarding hace un `upsert`, o
 * sea que alguien que completa el formulario para poder entrar se pisa el
 * nombre, la fecha de nacimiento, la ocupación y el sueldo que ya tenía.
 *
 * Por eso una lectura fallida devuelve `unknown` y **no** `pending`: ante la
 * duda, dejar pasar a alguien que quizá no hizo el onboarding es barato;
 * empujar a un usuario real a un flujo que le sobrescribe los datos, no.
 *
 * Vive acá y no en cada gate por la misma razón que `lib/billing/access.ts`: la
 * regla se chequea en el proxy, en la home, en el layout del dashboard y en el
 * del onboarding. Cuatro copias es una garantía de que alguna se desincronice.
 */
export async function getOnboardingStatus(
  supabase: Client,
  userId: string,
): Promise<OnboardingStatus> {
  // `maybeSingle` y no `single`: sin perfil todavía no es un error, es
  // exactamente el caso de alguien recién registrado. Con `single`, cero filas
  // venían como error y se mezclaban con las fallas de verdad.
  const { data, error } = await supabase
    .from('user_profiles')
    .select('onboarding_done')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return 'unknown'
  return data?.onboarding_done ? 'done' : 'pending'
}

/**
 * Si hay que mandar a alguien al onboarding.
 *
 * Solo `pending`. Un `unknown` sigue de largo: ver la nota de arriba.
 */
export async function needsOnboarding(supabase: Client, userId: string): Promise<boolean> {
  return (await getOnboardingStatus(supabase, userId)) === 'pending'
}
