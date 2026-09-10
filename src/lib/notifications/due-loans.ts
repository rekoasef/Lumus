import { formatCurrency } from '@/lib/utils/format-currency'
import { DUE_SOON_DAYS, daysBetween, type DuePhase } from './due-recurring'
import { dueTiming } from './due-notification'
import type { NewNotification } from '@/types/notifications.types'

/**
 * Qué cuotas de préstamo hay que avisar hoy.
 *
 * Misma forma que `due-recurring.ts` y el mismo tipo de aviso (`vencimiento`),
 * a propósito: para quien lo recibe, **una cuota que vence es un vencimiento**.
 * Crear un tipo aparte obligaría a activar una preferencia nueva a alguien que
 * ya dijo que quiere que le avisen de lo que vence.
 *
 * Lo único que no se comparte es el prefijo del `dedupe_key`: un préstamo y un
 * recurrente podrían tener el mismo id y pisarse, y el `unique (user_id,
 * dedupe_key)` haría desaparecer uno de los dos avisos en silencio.
 */

export interface LoanDue {
  id: string
  user_id: string
  counterparty: string
  installment_amount: number | null
  next_due_date: string | null
}

export interface LoanDueNotice {
  loan: LoanDue
  phase: DuePhase
  /** Negativo = ya venció. 0 = vence hoy. */
  daysUntil: number
  dedupeKey: string
}

export function loanDueDedupeKey(loanId: string, dueDate: string, phase: DuePhase): string {
  return `venc-prestamo:${loanId}:${dueDate}:${phase}`
}

export function selectLoanDueNotices(loans: readonly LoanDue[], today: string): LoanDueNotice[] {
  const notices: LoanDueNotice[] = []

  for (const loan of loans) {
    // Sin fecha no hay nada que avisar: es el caso del préstamo que diste, que
    // te devuelven cuando pueden.
    if (!loan.next_due_date) continue

    const daysUntil = daysBetween(today, loan.next_due_date)
    if (daysUntil > DUE_SOON_DAYS) continue

    const phase: DuePhase = daysUntil < 0 ? 'vencido' : 'proximo'
    notices.push({
      loan,
      phase,
      daysUntil,
      dedupeKey: loanDueDedupeKey(loan.id, loan.next_due_date, phase),
    })
  }

  return notices.sort((a, b) => a.daysUntil - b.daysUntil)
}

export function buildLoanDueNotification(notice: LoanDueNotice): NewNotification {
  const { loan, daysUntil, dedupeKey } = notice
  const amount = loan.installment_amount !== null
    ? ` · ${formatCurrency(loan.installment_amount, 'ARS', 'rounded')}`
    : ''

  return {
    userId: loan.user_id,
    type: 'vencimiento',
    title: `Cuota de ${loan.counterparty}`,
    body: `${dueTiming(daysUntil)}${amount}`,
    link: '/finanzas/prestamos',
    dedupeKey,
  }
}
