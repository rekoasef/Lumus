'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { loanRepaymentSchema, type LoanRepaymentInput } from '@/lib/validations/finance'
import type { Wallet } from '@/types/finance.types'
import { loanProgress, type Loan, type LoanRepayment } from '@/lib/finance/loans'
import { formatCurrency } from '@/lib/utils/format-currency'
import { localDateStr } from '@/lib/utils/format-date'

interface LoanPaymentFormProps {
  loan: Loan
  repayments: readonly LoanRepayment[]
  wallets: Wallet[]
  onSave: (data: LoanRepaymentInput) => Promise<void>
  onClose: () => void
}

export function LoanPaymentForm({ loan, repayments, wallets, onSave, onClose }: LoanPaymentFormProps) {
  const isTaken = loan.direction === 'tomado'
  const progress = loanProgress(loan, repayments)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoanRepaymentInput>({
    resolver: zodResolver(loanRepaymentSchema),
    defaultValues: {
      // El valor de la cuota viene puesto: en la enorme mayoría de los casos es
      // exactamente eso, y quien paga dos juntas registra dos.
      amount:    loan.installment_amount ?? undefined,
      wallet_id: loan.wallet_id ?? wallets[0]?.id ?? '',
      date:      localDateStr(),
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl p-5 sm:rounded-2xl sm:p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
            {isTaken ? 'Pagar una cuota' : 'Me devolvieron plata'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <p className="mb-5 text-sm text-[var(--text-secondary)]">
          {loan.counterparty}
          {isTaken && progress.remainingInstallments !== null && (
            <> · te quedan <strong className="text-[var(--text-primary)]">{progress.remainingInstallments}</strong> {progress.remainingInstallments === 1 ? 'cuota' : 'cuotas'}</>
          )}
          {!isTaken && (
            <> · falta cobrar <strong className="text-[var(--text-primary)]">{formatCurrency(progress.outstanding, 'ARS', 'auto')}</strong></>
          )}
        </p>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              CUÁNTO
            </label>
            <input
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.amount && <p className="mt-1 text-xs text-[var(--danger)]">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              {isTaken ? 'DE QUÉ BILLETERA SALIÓ' : 'A QUÉ BILLETERA ENTRÓ'}
            </label>
            <select
              {...register('wallet_id')}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
            >
              {wallets.map(w => (
                <option key={w.id} value={w.id} className="bg-[#1d1b28]">{w.name}</option>
              ))}
            </select>
            {errors.wallet_id && <p className="mt-1 text-xs text-[var(--danger)]">{errors.wallet_id.message}</p>}
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              CUÁNDO
            </label>
            <input
              type="date"
              {...register('date')}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
          </div>

          {isTaken && (
            <p className="text-[0.68rem] text-[var(--text-muted)]">
              Se registra como un gasto, así entra en tu presupuesto y en el reporte del mes.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
