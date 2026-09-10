'use client'

import { useRouter } from 'next/navigation'
import type { FinanceCategory, RecurringTransaction, Wallet } from '@/types/finance.types'
import { RecurringTransactionList } from './recurring-transaction-list'
import { FinanzasPageHeader, FinanzasPageShell } from './finanzas-page-header'

interface FijosViewProps {
  initialRecurring: RecurringTransaction[]
  wallets: Wallet[]
  categories: FinanceCategory[]
}

export function FijosView({ initialRecurring, wallets, categories }: FijosViewProps) {
  const router = useRouter()

  return (
    <FinanzasPageShell>
      <FinanzasPageHeader
        title="Fijos"
        description="Lo que se repite todos los meses y lo que está por vencer."
      />

      <section className="lumus-glass rounded-2xl p-3 sm:p-6">
        <RecurringTransactionList
          initialRecurring={initialRecurring}
          wallets={wallets}
          categories={categories}
          // Aplicar un fijo mueve un saldo y los totales del mes. Con la
          // pantalla partida en rutas, esos números viven en otras páginas: lo
          // que hay que invalidar es el cache del server, no un estado local.
          onTransactionApplied={() => router.refresh()}
        />
      </section>
    </FinanzasPageShell>
  )
}
