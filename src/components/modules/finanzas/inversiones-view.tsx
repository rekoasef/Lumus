'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Wallet } from '@/types/finance.types'
import type { Holding, HoldingTrade, PriceQuotes } from '@/lib/finance/holdings'
import type { DailyRate } from '@/lib/finance/purchasing-power'
import type { InvestmentEvent } from '@/lib/finance/investment'
import type { ExchangeRates } from '@/lib/finance/exchange-rates'
import type { CreateWalletInput } from '@/lib/validations/finance'
import { PortfolioSection } from './portfolio-section'
import { InvestmentWalletsSection } from './investment-wallets-section'
import { WalletAdjustForm, type WalletAdjustSubmit } from './wallet-adjust-form'
import { WalletForm } from './wallet-form'
import { FinanzasPageHeader, FinanzasPageShell } from './finanzas-page-header'
import { useWallets, type AdjustBalanceResult } from '@/hooks/use-wallets'
import { useInvestmentReturns } from '@/hooks/use-investment-returns'

interface InversionesViewProps {
  /** Todas las billeteras: el ajuste de una inversión necesita la contraparte del aporte. */
  initialWallets: Wallet[]
  initialInvestmentEvents: Record<string, InvestmentEvent[]>
  holdings: Holding[]
  trades: HoldingTrade[]
  /** Precios de mercado, resueltos en el server. */
  quotes: PriceQuotes
  quotesFetchedAt: string | null
  rates: ExchangeRates
  rateHistory: DailyRate[]
}

export function InversionesView({
  initialWallets,
  initialInvestmentEvents,
  holdings,
  trades,
  quotes,
  quotesFetchedAt,
  rates,
  rateHistory,
}: InversionesViewProps) {
  const router = useRouter()
  const { wallets, adjustBalance, createWallet } = useWallets(initialWallets)
  const [creatingPortfolio, setCreatingPortfolio] = useState(false)

  const [investmentEvents, setInvestmentEvents] =
    useState<Record<string, InvestmentEvent[]>>(initialInvestmentEvents)
  const [adjustingWallet, setAdjustingWallet] = useState<Wallet | null>(null)

  const investmentReturns = useInvestmentReturns(wallets, investmentEvents, rateHistory)
  // Dos modos de billetera de inversión (`E2`): las que tienen especies adentro y
  // las que son un saldo que se actualiza.
  const portfolioWallets = wallets.filter(w => w.type === 'inversion' && w.investment_mode === 'tenencias')
  const balanceWallets = wallets.filter(w => w.type === 'inversion' && w.investment_mode !== 'tenencias')

  async function handleCreatePortfolio(input: CreateWalletInput) {
    try {
      await createWallet(input)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo crear la cartera')
      return
    }
    setCreatingPortfolio(false)
    toast.success('Cartera creada')
    router.refresh()
  }

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
        description="Tus carteras con acciones y cripto, y lo que tiene saldo, en un solo lugar."
      />

      <div className="space-y-8">
        {/* Las carteras van arriba: es lo que se viene a mirar todos los días,
            porque los precios se mueven solos. */}
        <PortfolioSection
          wallets={portfolioWallets}
          holdings={holdings}
          trades={trades}
          quotes={quotes}
          quotesFetchedAt={quotesFetchedAt}
          rates={rates}
          rateHistory={rateHistory}
          onCreatePortfolio={() => setCreatingPortfolio(true)}
          onAdjustCash={setAdjustingWallet}
        />

        {/* Si no hay ninguna billetera de saldo, la sección no aparece: su
            estado vacío le explicaría a alguien con un broker cómo marcar una
            billetera, que es justo lo que no necesita. */}
        {balanceWallets.length > 0 && (
          <InvestmentWalletsSection
            wallets={balanceWallets}
            events={investmentEvents}
            returns={investmentReturns}
            onAdjust={setAdjustingWallet}
          />
        )}
      </div>

      {creatingPortfolio && (
        <WalletForm
          preset={{ type: 'inversion', investment_mode: 'tenencias' }}
          onSave={handleCreatePortfolio}
          onClose={() => setCreatingPortfolio(false)}
        />
      )}

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
