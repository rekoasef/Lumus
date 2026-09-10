'use client'

import { useMemo } from 'react'
import type { Wallet } from '@/types/finance.types'
import type { DailyRate } from '@/lib/finance/purchasing-power'
import {
  investmentReturn,
  investmentReturnUsd,
  movementsOf,
  type InvestmentEvent,
  type InvestmentReturn,
  type InvestmentReturnUsd,
} from '@/lib/finance/investment'
import { localDateStr } from '@/lib/utils/format-date'

export interface WalletInvestmentReturn {
  ars: InvestmentReturn
  usd: InvestmentReturnUsd | null
}

/**
 * El rendimiento de cada billetera de inversión, en pesos y en dólares.
 *
 * La aritmética vive en `lib/finance/investment.ts` y está testeada; lo que
 * hace este hook es el ensamblado —qué billetera con qué eventos y con qué
 * cotizaciones— que hasta ahora estaba escrito dentro del componente
 * monolítico. Al partir Finanzas en varias pantallas quedaba en dos lugares
 * (billeteras e inversiones), y **una regla financiera escrita dos veces** es
 * exactamente lo que produjo el bug de las metas que dio origen a `rules.ts`.
 */
export function useInvestmentReturns(
  wallets: Wallet[],
  events: Record<string, InvestmentEvent[]>,
  rateHistory: DailyRate[],
): Record<string, WalletInvestmentReturn> {
  return useMemo(() => {
    const today = localDateStr()

    return Object.fromEntries(
      wallets
        .filter(w => w.type === 'inversion' && w.investment_baseline !== null)
        .map(w => {
          const movements = movementsOf(events[w.id] ?? [])
          const baseline = w.investment_baseline ?? 0
          const ars = investmentReturn(w.balance, baseline, movements)

          // Solo tiene sentido para lo que está en pesos: una inversión en
          // dólares ya está medida en la vara con la que se la quiere medir.
          const usd = w.currency === 'ARS' && w.investment_baseline_date
            ? investmentReturnUsd(w.balance, baseline, w.investment_baseline_date, movements, rateHistory, today)
            : null

          return [w.id, { ars, usd }] as const
        }),
    )
  }, [wallets, events, rateHistory])
}
