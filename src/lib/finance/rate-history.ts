import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { DailyRate } from './purchasing-power'

/**
 * Lee la historia de cotizaciones, paginando.
 *
 * Existe por un bug que costó encontrar: **PostgREST corta en 1000 filas y un
 * `limit` mayor no lo levanta** — pedirle 2000 o 4000 devuelve 1000 igual, sin
 * error y sin aviso. La pantalla de mercado pedía todo en orden ascendente y
 * recibía de 2011 a 2014: el gráfico del dólar quedaba vacío porque no había un
 * solo dato de los últimos noventa días.
 *
 * Lo peligroso no era ese caso, que se ve enseguida, sino los otros dos: al
 * valuar el costo de una tenencia comprada antes de 2022, la cotización de esa
 * fecha simplemente no estaba y el rendimiento desaparecía **sin decir nada**.
 *
 * Por eso todas las lecturas de la serie pasan por acá.
 */

/** El techo de PostgREST. Pedir más no sirve: hay que paginar. */
const PAGE_SIZE = 1000

/** Cuántas páginas como mucho. 20.000 días son más de 50 años de serie. */
const MAX_PAGES = 20

type Client = SupabaseClient<Database>

/**
 * Devuelve la serie de más nueva a más vieja.
 *
 * `since` acota cuánto traer: pedirle siempre todo son cinco viajes a la base
 * en cada carga de pantalla, y casi nunca hace falta.
 */
export async function fetchRateHistory(supabase: Client, since?: string | null): Promise<DailyRate[]> {
  const rates: DailyRate[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    let query = supabase
      .from('exchange_rate_history')
      .select('date, usd')
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (since) query = query.gte('date', since)

    const { data, error } = await query
    if (error) {
      console.error('[cotizaciones] no se pudo leer la historia', error)
      break
    }

    const rows = data ?? []
    rates.push(...rows.map(r => ({ date: r.date, usd: Number(r.usd) })))

    // Una página incompleta es la última.
    if (rows.length < PAGE_SIZE) break
  }

  return rates
}

/** Cuántos años atrás alcanza para una pantalla. */
export function yearsAgo(years: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}
