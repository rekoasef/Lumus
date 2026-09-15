'use client'

import { Archive, ArrowDownLeft, ArrowUpRight, CalendarClock, Check, Pencil, Trash2 } from 'lucide-react'
import { daysUntilDue, loanProgress, type Loan, type LoanRepayment } from '@/lib/finance/loans'
import { formatCurrency } from '@/lib/utils/format-currency'
import { localDateStr } from '@/lib/utils/format-date'

interface LoanCardProps {
  loan: Loan
  repayments: readonly LoanRepayment[]
  onPay: (loan: Loan) => void
  onEdit: (loan: Loan) => void
  onDelete: (id: string) => void
  /** Solo llega en los préstamos saldados: ver el botón de archivar. */
  onArchive: (id: string) => void
}

/** A cuántos días de vencer una cuota se marca en naranja. Igual que el motor de avisos. */
const DUE_SOON_DAYS = 3

function formatDueDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export function LoanCard({ loan, repayments, onPay, onEdit, onDelete, onArchive }: LoanCardProps) {
  const isTaken = loan.direction === 'tomado'
  const progress = loanProgress(loan, repayments)

  const Icon = isTaken ? ArrowDownLeft : ArrowUpRight
  // Una deuda se lee en rojo y una acreencia en verde: lo que se debe pesa
  // distinto que lo que falta cobrar, aunque los dos sean "pendiente".
  const accent = progress.settled ? 'var(--success)' : isTaken ? 'var(--danger)' : 'var(--accent-lumus)'

  const daysLeft = loan.next_due_date ? daysUntilDue(loan.next_due_date, localDateStr()) : null
  const overdue  = daysLeft !== null && daysLeft < 0
  const dueSoon  = daysLeft !== null && daysLeft >= 0 && daysLeft <= DUE_SOON_DAYS

  const paidRatio =
    progress.remainingInstallments !== null && loan.installments
      ? progress.paidInstallments / loan.installments
      : loan.principal > 0
        ? Math.min(1, progress.repaid / loan.principal)
        : 0

  return (
    <div className="lumus-glass flex flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{loan.counterparty}</p>
            <p className="text-[0.68rem] text-[var(--text-muted)]">
              {isTaken ? 'Sacaste' : 'Prestaste'} {formatCurrency(loan.principal, 'ARS', 'auto')}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => onEdit(loan)}
            aria-label="Editar préstamo"
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
          >
            <Pencil size={14} />
          </button>
          {/*
            Archivar solo aparece cuando no queda nada pendiente. Con deuda
            viva, hacer desaparecer el préstamo y dejar los movimientos sacaría
            la deuda del patrimonio sin que nadie la haya pagado — por eso ahí
            la única salida es eliminar, que se lleva todo.
          */}
          {progress.settled && (
            <button
              onClick={() => onArchive(loan.id)}
              aria-label="Archivar préstamo"
              className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
            >
              <Archive size={14} />
            </button>
          )}
          <button
            onClick={() => onDelete(loan.id)}
            aria-label="Eliminar préstamo"
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">
          {progress.settled ? 'SALDADO' : isTaken ? 'TE FALTA PAGAR' : 'TE FALTA COBRAR'}
        </p>
        <p className="lumus-heading mt-1 text-2xl font-bold" style={{ color: accent }}>
          {progress.settled
            ? <span className="inline-flex items-center gap-1.5"><Check size={20} /> Listo</span>
            : formatCurrency(progress.outstanding, 'ARS', 'auto')}
        </p>

        {progress.remainingInstallments !== null && !progress.settled && (
          <p className="mt-0.5 text-[0.68rem] text-[var(--text-muted)]">
            {progress.remainingInstallments} de {loan.installments} {progress.remainingInstallments === 1 ? 'cuota' : 'cuotas'}
            {loan.installment_amount ? ` de ${formatCurrency(loan.installment_amount, 'ARS', 'auto')}` : ''}
          </p>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(paidRatio * 100)}%`, background: accent }}
        />
      </div>

      {Number(loan.repaid_before_tracking) > 0 && (
        <p className="mt-3 text-[0.68rem] text-[var(--text-muted)]">
          Incluye {formatCurrency(Number(loan.repaid_before_tracking), 'ARS', 'auto')} que
          {isTaken ? ' pagaste' : ' te devolvieron'} antes de cargarlo en Lumus
        </p>
      )}

      {progress.surchargePercent !== null && progress.surchargePercent > 0 && (
        <p className="mt-3 text-[0.68rem] text-[var(--text-muted)]">
          {isTaken ? 'Devolvés' : 'Te devuelven'} {formatCurrency(progress.totalToRepay ?? 0, 'ARS', 'auto')} en total —
          un {progress.surchargePercent.toLocaleString('es-AR', { maximumFractionDigits: 1 })}% más
        </p>
      )}

      {loan.next_due_date && !progress.settled && (
        <div
          className="mt-3 flex items-center gap-1.5 text-[0.7rem]"
          style={{ color: overdue ? 'var(--danger)' : dueSoon ? '#ffb86e' : 'var(--text-muted)' }}
        >
          <CalendarClock size={13} />
          <span>
            {overdue
              ? `Venció el ${formatDueDate(loan.next_due_date)}`
              : daysLeft === 0
                ? 'Vence hoy'
                : `Vence el ${formatDueDate(loan.next_due_date)}`}
          </span>
        </div>
      )}

      {!progress.settled && (
        <button
          onClick={() => onPay(loan)}
          className="mt-4 w-full rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          {isTaken ? 'Pagué una cuota' : 'Me devolvieron'}
        </button>
      )}
    </div>
  )
}
