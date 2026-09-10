'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Wallet } from '@/types/finance.types'
import type { CreateWalletInput, UpdateWalletInput } from '@/lib/validations/finance'
import type { DailyRate } from '@/lib/finance/purchasing-power'
import type { InvestmentEvent } from '@/lib/finance/investment'
import { WalletCard } from './wallet-card'
import { WalletForm } from './wallet-form'
import { WalletAdjustForm, type WalletAdjustSubmit } from './wallet-adjust-form'
import { FinanzasPageHeader, FinanzasPageShell } from './finanzas-page-header'
import { useWallets, type AdjustBalanceResult } from '@/hooks/use-wallets'
import { useInvestmentReturns } from '@/hooks/use-investment-returns'
import { confirm } from '@/components/shared/confirm-dialog'

interface BilleterasViewProps {
  initialWallets: Wallet[]
  /** Aportes, retiros y rendimientos de cada inversión, por id de billetera. */
  initialInvestmentEvents: Record<string, InvestmentEvent[]>
  /** Historia de cotizaciones, para el rendimiento en dólares. */
  rateHistory: DailyRate[]
}

export function BilleterasView({
  initialWallets,
  initialInvestmentEvents,
  rateHistory,
}: BilleterasViewProps) {
  const { wallets, loading, createWallet, updateWallet, adjustBalance, deleteWallet } =
    useWallets(initialWallets)

  const [showWalletForm, setShowWalletForm] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [adjustingWallet, setAdjustingWallet] = useState<Wallet | null>(null)

  // Lo que le fue pasando a cada inversión. Se guarda acá y no se relee del
  // server en cada ajuste: lo que se acaba de registrar vuelve en la respuesta.
  const [investmentEvents, setInvestmentEvents] =
    useState<Record<string, InvestmentEvent[]>>(initialInvestmentEvents)

  const investmentReturns = useInvestmentReturns(wallets, investmentEvents, rateHistory)

  async function handleSaveWallet(data: CreateWalletInput) {
    if (editingWallet) {
      const { balance: _b, ...updateData } = data
      await updateWallet(editingWallet.id, updateData as UpdateWalletInput)
      toast.success('Billetera actualizada')
    } else {
      await createWallet(data)
      toast.success('Billetera creada')
    }
    setShowWalletForm(false)
    setEditingWallet(null)
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

    // Un aporte cambia el capital invertido y un rendimiento suma al historial:
    // los dos tienen que verse ya, no en la próxima recarga.
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

  async function handleDeleteWallet(id: string) {
    const ok = await confirm({
      title: 'Eliminar billetera',
      description: 'Las transacciones asociadas quedarán sin billetera asignada. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    await deleteWallet(id)
    toast.success('Billetera eliminada')
  }

  return (
    <FinanzasPageShell>
      <FinanzasPageHeader
        title="Billeteras"
        description="Dónde está tu plata y cuánto hay en cada lugar."
        action={
          <button
            onClick={() => { setEditingWallet(null); setShowWalletForm(true) }}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            <Plus size={16} />
            Nueva billetera
          </button>
        }
      />

      {wallets.length === 0 ? (
        <div className="lumus-glass rounded-2xl py-20 text-center">
          <p className="text-[var(--text-muted)]">Todavía no tenés billeteras.</p>
          <button
            onClick={() => setShowWalletForm(true)}
            className="mt-4 text-sm text-[var(--accent-lumus)] hover:underline"
          >
            Crear tu primera billetera
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map(wallet => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              investment={investmentReturns[wallet.id] ?? null}
              onEdit={w => { setEditingWallet(w); setShowWalletForm(true) }}
              onAdjust={setAdjustingWallet}
              onDelete={handleDeleteWallet}
            />
          ))}
        </div>
      )}

      {showWalletForm && (
        <WalletForm
          onSave={handleSaveWallet}
          onClose={() => { setShowWalletForm(false); setEditingWallet(null) }}
          initial={editingWallet ?? undefined}
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
