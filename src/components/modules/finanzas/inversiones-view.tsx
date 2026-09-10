'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Wallet } from '@/types/finance.types'
import type { Holding } from '@/lib/finance/holdings'
import type { DailyRate } from '@/lib/finance/purchasing-power'
import type { InvestmentEvent } from '@/lib/finance/investment'
import { HoldingsSection } from './holdings-section'
import { InvestmentWalletsSection } from './investment-wallets-section'
import { WalletAdjustForm, type WalletAdjustSubmit } from './wallet-adjust-form'
import { FinanzasPageHeader, FinanzasPageShell } from './finanzas-page-header'
import { useWallets, type AdjustBalanceResult } from '@/hooks/use-wallets'
import { useInvestmentReturns } from '@/hooks/use-investment-returns'
import { useExchangeRates } from '@/hooks/use-exchange-rates'

interface InversionesViewProps {
  /** Todas las billeteras: el ajuste de una inversión necesita la contraparte del aporte. */
  initialWallets: Wallet[]
  initialInvestmentEvents: Record<string, InvestmentEvent[]>
  initialHoldings: Holding[]
  /** Precios de cripto en USD, resueltos en el server. */
  cryptoPrices: Record<string, number>
  rateHistory: DailyRate[]
}

export function InversionesView({
  initialWallets,
  initialInvestmentEvents,
  initialHoldings,
  cryptoPrices,
  rateHistory,
}: InversionesViewProps) {
  const { wallets, adjustBalance } = useWallets(initialWallets)
  const { rates: exchangeRates } = useExchangeRates()

  const [investmentEvents, setInvestmentEvents] =
    useState<Record<string, InvestmentEvent[]>>(initialInvestmentEvents)
  const [adjustingWallet, setAdjustingWallet] = useState<Wallet | null>(null)

  const investmentReturns = useInvestmentReturns(wallets, investmentEvents, rateHistory)
  const investmentWallets = wallets.filter(w => w.type === 'inversion')

  async function handleAdjustBalance(input: WalletAdjustSubmit) {
    if (!adjustingWallet) return
    const walletId = adjustingWallet.id

    let result: AdjustBalanceResult | null = null
    try {
      result = await adjustBalance(walletId, {
        newBalance: input.newBalance,
        note: input.note,
        movement: input.movement,
        movementDate: input.movementDate,
        counterpartWalletId: input.counterpartWalletId,
      })
    } catch (e) {
      // El diálogo queda abierto a propósito: lo cargado sigue ahí para corregir.
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar el balance')
      return
    }

    if (result?.events.length) {
      const events = result.events
      setInvestmentEvents(prev => ({
        ...prev,
        [walletId]: [...(prev[walletId] ?? []), ...events],
      }))
    }

    setAdjustingWallet(null)
    toast.success('Balance actualizado')
  }

  return (
    <FinanzasPageShell>
      <FinanzasPageHeader
        title="Inversiones"
        description="Lo que tiene saldo y lo que tiene unidades, en un solo lugar."
      />

      <div className="space-y-8">
        {/* Las billeteras de inversión van arriba: son plata que ya está
            puesta y que se actualiza a mano, así que es lo primero que se
            viene a mirar acá. */}
        <InvestmentWalletsSection
          wallets={investmentWallets}
          events={investmentEvents}
          returns={investmentReturns}
          onAdjust={setAdjustingWallet}
        />

        <HoldingsSection
          initialHoldings={initialHoldings}
          prices={cryptoPrices}
          // Si la cotización todavía no cargó, la conversión a pesos espera:
          // mostrar un valor en ARS con un dólar inventado es peor que no
          // mostrarlo, y el valor en dólares se ve igual.
          arsPerUsd={exchangeRates?.USD ?? 0}
          rateHistory={rateHistory}
        />
      </div>

      {adjustingWallet && (
        <WalletAdjustForm
          wallet={adjustingWallet}
          wallets={wallets}
          onAdjust={handleAdjustBalance}
          onClose={() => setAdjustingWallet(null)}
        />
      )}
    </FinanzasPageShell>
  )
}
