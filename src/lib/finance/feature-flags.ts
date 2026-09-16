import type { InvestmentMode } from '@/types/finance.types'

/**
 * Features terminadas pero escondidas de la UI.
 *
 * Nada acá está roto: es código que anda y que se decidió no mostrar todavía.
 * Prender el flag alcanza para que vuelva — no hay que reescribir nada ni
 * revertir migraciones.
 */

/**
 * Carteras con acciones y cripto (`E2` en `docs/BACKLOG.md`), apagado el
 * 2026-09-16: la pantalla no convenció y se prefirió no mostrarla antes que
 * dejarla a medio gusto en manos de los testers.
 *
 * Lo que sigue vivo con el flag apagado, a propósito:
 * - El modelo (`holdings`, `holding_trades`) y la migración `00033`, ya en prod.
 * - Las API routes y los tests de `holdings.ts` y `portfolio-data.ts`.
 * - La lectura del server, que con cero tenencias no consulta ninguna API de
 *   precios (`getPriceQuotes` no pide nada si no hay especies) ni escribe
 *   historia de precios (`recordHoldingPrices` corta en cero).
 *
 * Con el flag apagado, una billetera que quedó marcada como cartera se muestra
 * como una billetera de inversión con saldo: es lo que era antes de `E2`, y
 * evita que alguien tenga una billetera invisible.
 */
export const PORTFOLIO_WALLETS_ENABLED = false

/**
 * Si esta billetera se muestra como cartera de especies. Falso mientras la
 * feature esté escondida.
 *
 * Toma `string` y no los tipos unión porque también la llaman las API routes
 * con la fila cruda de Supabase, donde las columnas llegan como texto.
 */
export function isPortfolioWallet(wallet: { type: string; investment_mode: string | null }): boolean {
  return PORTFOLIO_WALLETS_ENABLED && wallet.type === 'inversion' && wallet.investment_mode === 'tenencias'
}

/**
 * El modo con el que se guarda una billetera de inversión. Con las carteras
 * escondidas no se puede guardar una nueva: sin esto el flag sería cosmético
 * —la pantalla no las muestra pero la API las sigue creando— y quedarían
 * billeteras invisibles.
 */
export function effectiveInvestmentMode(mode: string | null | undefined): InvestmentMode {
  if (!PORTFOLIO_WALLETS_ENABLED) return 'saldo'
  return mode === 'tenencias' ? 'tenencias' : 'saldo'
}
