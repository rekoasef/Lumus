import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { fetchRateHistory } from './rate-history'
import { latestRate, monthlyRates, type DailyRate } from './purchasing-power'

export interface PublicRates {
  /** Una cotización por mes, de más vieja a más nueva. */
  monthly: DailyRate[]
  latest: DailyRate | null
}

/**
 * La historia del blue para la calculadora de la landing, que la ve gente sin
 * sesión.
 *
 * `exchange_rate_history` solo la lee quien tiene sesión, así que esto va con
 * `service_role`, en el servidor. No expone nada de nadie: es la cotización del
 * dólar, la misma para todos.
 *
 * Cacheada un día: el cron guarda una cotización por día, y sin caché cada
 * visita a la landing serían seis viajes a la base (la serie entera, paginada).
 */
export const getPublicRates = unstable_cache(
  async (): Promise<PublicRates> => {
    const rates = await fetchRateHistory(createServiceClient())
    return { monthly: monthlyRates(rates), latest: latestRate(rates) }
  },
  ['public-rates-v1'],
  { revalidate: 60 * 60 * 24 },
)
