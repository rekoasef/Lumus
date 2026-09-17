import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { TERMS_VERSION } from './owner'

type Client = SupabaseClient<Database>

export type TermsStatus = 'accepted' | 'pending' | 'unknown'

/**
 * Si el usuario aceptó la versión vigente de los términos.
 *
 * Mismo criterio que `getOnboardingStatus`: una lectura fallida es `unknown` y
 * deja pasar. Trabar a un usuario que paga por un hipo de la base es peor que
 * dejar pasar una vez a alguien que todavía no aceptó: se le pide en la
 * próxima navegación.
 */
export async function getTermsStatus(supabase: Client, userId: string): Promise<TermsStatus> {
  const { data, error } = await supabase
    .from('legal_acceptances')
    .select('id')
    .eq('user_id', userId)
    .eq('document', 'terminos')
    .eq('version', TERMS_VERSION)
    .maybeSingle()

  if (error) return 'unknown'
  return data ? 'accepted' : 'pending'
}
