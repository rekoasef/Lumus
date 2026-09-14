'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { FinanceCategory, Wallet } from '@/types/finance.types'
import type { CreateLoanInput, LoanRepaymentInput } from '@/lib/validations/finance'
import { loanTotals, type Loan, type LoanRepayment } from '@/lib/finance/loans'
import { LoanCard } from './loan-card'
import { LoanForm } from './loan-form'
import { LoanPaymentForm } from './loan-payment-form'
import { FinanzasPageHeader, FinanzasPageShell } from './finanzas-page-header'
import { useLoans } from '@/hooks/use-loans'
import { useWallets } from '@/hooks/use-wallets'
import { formatCurrency } from '@/lib/utils/format-currency'
import { confirm } from '@/components/shared/confirm-dialog'

/**
 * Qué se le dice a alguien antes de sacar un préstamo de la pantalla.
 *
 * Son dos intenciones distintas y el texto tiene que dejar claro cuál es cuál:
 * eliminar es "me equivoqué al cargarlo" y se lleva los movimientos; archivar
 * es "esto terminó" y los deja. El aviso de los presupuestos no es un detalle:
 * borrar un préstamo con cuotas pagadas cambia meses ya cerrados.
 */
const DELETE_COPY = {
  title: 'Eliminar préstamo',
  description: (paid: number) =>
    paid === 0
      ? 'Se borra el préstamo y el movimiento del desembolso. El saldo de tu billetera vuelve a como estaba antes.'
      : `Se borra el préstamo con sus ${paid + 1} movimientos: el desembolso y ${paid === 1 ? 'la cuota que registraste' : `las ${paid} cuotas que registraste`}. Esos gastos salen de los presupuestos de sus meses y los saldos vuelven a como estaban. Si el préstamo fue de verdad, registrá lo que falta y archivalo: así el historial queda.`,
  confirmLabel: 'Eliminar',
  success: 'Préstamo eliminado',
  error: 'No se pudo eliminar el préstamo',
} as const

const ARCHIVE_COPY = {
  title: 'Archivar préstamo',
  description: 'Deja de mostrarse, pero los movimientos se quedan: las cuotas que pagaste siguen en tu historial, en los presupuestos de sus meses y en los reportes.',
  confirmLabel: 'Archivar',
  success: 'Préstamo archivado',
  error: 'No se pudo archivar el préstamo',
} as const

interface PrestamosViewProps {
  initialLoans: Loan[]
  initialRepayments: Record<string, LoanRepayment[]>
  initialWallets: Wallet[]
  categories: FinanceCategory[]
}

export function PrestamosView({
  initialLoans,
  initialRepayments,
  initialWallets,
  categories,
}: PrestamosViewProps) {
  const { wallets, setWalletBalance } = useWallets(initialWallets)
  const { loans, repayments, loading, createLoan, updateLoan, removeLoan, registerRepayment } =
    useLoans(initialLoans, initialRepayments, {
      onWalletBalance: updated => {
        for (const w of updated) setWalletBalance(w.id, w.balance)
      },
    })

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Loan | null>(null)
  const [paying, setPaying] = useState<Loan | null>(null)

  // Lo que los préstamos le hacen al patrimonio. La cuenta vive en
  // `lib/finance/loans.ts`: acá solo se muestra.
  const totals = loanTotals(loans, repayments)

  async function handleSave(data: CreateLoanInput) {
    const saved = editing
      ? await updateLoan(editing.id, data)
      : await createLoan(data)

    if (!saved) {
      toast.error(editing ? 'No se pudo guardar el préstamo' : 'No se pudo crear el préstamo')
      return
    }
    toast.success(editing ? 'Préstamo actualizado' : 'Préstamo creado')
    setShowForm(false)
    setEditing(null)
  }

  async function handlePay(data: LoanRepaymentInput) {
    if (!paying) return
    const ok = await registerRepayment(paying.id, data)
    if (!ok) {
      toast.error('No se pudo registrar el movimiento')
      return
    }
    toast.success(paying.direction === 'tomado' ? 'Cuota registrada' : 'Devolución registrada')
    setPaying(null)
  }

  async function handleDelete(id: string) {
    // Las cuotas o cobros ya registrados: se van con el préstamo, y se dice
    // cuántos son porque borrar movimientos de plata no puede ser una sorpresa.
    const paid = repayments[id]?.length ?? 0

    const ok = await confirm({
      title: DELETE_COPY.title,
      description: DELETE_COPY.description(paid),
      confirmLabel: DELETE_COPY.confirmLabel,
    })
    if (!ok) return

    const result = await removeLoan(id)
    if (!result.ok) {
      toast.error(result.error ?? DELETE_COPY.error)
      return
    }
    toast.success(DELETE_COPY.success)
  }

  async function handleArchive(id: string) {
    const ok = await confirm({
      title: ARCHIVE_COPY.title,
      description: ARCHIVE_COPY.description,
      confirmLabel: ARCHIVE_COPY.confirmLabel,
    })
    if (!ok) return

    const result = await removeLoan(id, 'archivar')
    if (!result.ok) {
      toast.error(result.error ?? ARCHIVE_COPY.error)
      return
    }
    toast.success(ARCHIVE_COPY.success)
  }

  const taken = loans.filter(l => l.direction === 'tomado')
  const given = loans.filter(l => l.direction === 'otorgado')

  return (
    <FinanzasPageShell>
      <FinanzasPageHeader
        title="Préstamos"
        description="Lo que debés y lo que te deben."
        action={
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            disabled={loading || wallets.length === 0}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            <Plus size={16} />
            Nuevo préstamo
          </button>
        }
      />

      {loans.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="lumus-glass rounded-xl p-4">
            <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">DEBÉS</p>
            <p className="lumus-heading mt-2 text-xl font-bold text-[var(--danger)]">
              {formatCurrency(totals.debt, 'ARS', 'auto')}
            </p>
            <p className="mt-0.5 text-[0.6rem] text-[var(--text-muted)]">Resta de tu patrimonio</p>
          </div>
          <div className="lumus-glass rounded-xl p-4">
            <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">TE DEBEN</p>
            <p className="lumus-heading mt-2 text-xl font-bold text-[var(--accent-lumus)]">
              {formatCurrency(totals.receivable, 'ARS', 'auto')}
            </p>
            <p className="mt-0.5 text-[0.6rem] text-[var(--text-muted)]">Sigue siendo tuyo, pero no lo tenés</p>
          </div>
        </div>
      )}

      {wallets.length === 0 ? (
        <div className="lumus-glass rounded-2xl py-20 text-center">
          <p className="text-[var(--text-muted)]">Primero creá una billetera.</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Un préstamo necesita saber de dónde sale o adónde entra la plata.</p>
        </div>
      ) : loans.length === 0 ? (
        <div className="lumus-glass rounded-2xl py-20 text-center">
          <p className="text-[var(--text-muted)]">No tenés préstamos cargados.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-sm text-[var(--accent-lumus)] hover:underline"
          >
            Cargar el primero
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {taken.length > 0 && (
            <section>
              <h2 className="lumus-heading mb-4 text-lg font-semibold text-[var(--text-primary)]">
                Los que sacaste
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {taken.map(loan => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    repayments={repayments[loan.id] ?? []}
                    onPay={setPaying}
                    onEdit={l => { setEditing(l); setShowForm(true) }}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                  />
                ))}
              </div>
            </section>
          )}

          {given.length > 0 && (
            <section>
              <h2 className="lumus-heading mb-4 text-lg font-semibold text-[var(--text-primary)]">
                Los que diste
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {given.map(loan => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    repayments={repayments[loan.id] ?? []}
                    onPay={setPaying}
                    onEdit={l => { setEditing(l); setShowForm(true) }}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showForm && (
        <LoanForm
          wallets={wallets}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          initial={editing ?? undefined}
        />
      )}

      {paying && (
        <LoanPaymentForm
          loan={paying}
          repayments={repayments[paying.id] ?? []}
          wallets={wallets}
          onSave={handlePay}
          onClose={() => setPaying(null)}
        />
      )}
    </FinanzasPageShell>
  )
}
