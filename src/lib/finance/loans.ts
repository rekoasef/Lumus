/**
 * La aritmética de los préstamos.
 *
 * Vive acá y no en un componente por la misma razón que `rules.ts`: cuánto se
 * debe es una regla de negocio, y una regla escrita dos veces termina mostrando
 * dos números distintos en dos pantallas. Ya pasó con el progreso de una meta.
 */

export type LoanDirection = 'tomado' | 'otorgado'

export interface Loan {
  id: string
  direction: LoanDirection
  counterparty: string
  wallet_id: string
  category_id: string | null
  /** Lo recibido (tomado) o entregado (otorgado). No es lo que se devuelve. */
  principal: number
  installments: number | null
  installment_amount: number | null
  next_due_date: string | null
  started_on: string
  notes: string | null
}

/** Una cuota pagada o un cobro recibido. El monto siempre va positivo. */
export interface LoanRepayment {
  id: string
  amount: number
  date: string
}

export interface LoanProgress {
  /** Lo que se devuelve en total. Null en un préstamo sin cuotas pactadas. */
  totalToRepay: number | null
  /** Lo que ya se pagó (tomado) o ya se cobró (otorgado). */
  repaid: number
  /** Cuánto falta. Ver la nota de abajo: las dos direcciones no se miden igual. */
  outstanding: number
  paidInstallments: number
  remainingInstallments: number | null
  /**
   * Cuánto más se devuelve que lo recibido, en porcentaje.
   *
   * Es aritmética, no una TNA: 500.000 recibidos y 18 cuotas de 45.000 son
   * 810.000, un 62% más. **No calcular ni mostrar TNA/CFT** — ese es un número
   * regulado, y el día que dé distinto al del banco el que queda mal es Lumus.
   */
  surchargePercent: number | null
  settled: boolean
}

/**
 * Cuánto falta de un préstamo.
 *
 * ── Por qué las dos direcciones no se miden igual ──
 *
 * Un préstamo **tomado** tiene un contrato: doce cuotas de 45.000 y listo. Lo
 * que falta es cuántas cuotas quedan, y por decisión del dueño (2026-09-10) el
 * pendiente **incluye el interés futuro**: es el número que la persona tiene en
 * la cabeza, y ante la duda conviene ser pesimista con una deuda antes que
 * optimista.
 *
 * Un préstamo **otorgado** no tiene contrato: le prestaste a un amigo y te paga
 * cuando puede. "En cuántas cuotas te lo devuelven" es una ficción que nadie
 * completa con la verdad, así que ahí lo que falta se mide en plata —
 * `prestado − cobrado`— y las cuotas, si se cargaron, son solo el plan
 * esperado.
 *
 * Una cuota registrada cuenta como **una** cuota, sin importar el monto: el
 * formulario propone el valor de la cuota, y quien paga dos juntas registra
 * dos. Es predecible y se explica en una línea, que es más de lo que se puede
 * decir de dividir plata por plata y redondear.
 */
export function loanProgress(loan: Loan, repayments: readonly LoanRepayment[]): LoanProgress {
  const repaid = repayments.reduce((sum, r) => sum + r.amount, 0)
  const paidInstallments = repayments.length

  const hasPlan = loan.installments !== null && loan.installment_amount !== null
  const totalToRepay = hasPlan ? loan.installments! * loan.installment_amount! : null

  const surchargePercent =
    totalToRepay !== null && loan.principal > 0
      ? ((totalToRepay - loan.principal) / loan.principal) * 100
      : null

  if (loan.direction === 'tomado' && hasPlan) {
    const remainingInstallments = Math.max(0, loan.installments! - paidInstallments)
    return {
      totalToRepay,
      repaid,
      outstanding: remainingInstallments * loan.installment_amount!,
      paidInstallments,
      remainingInstallments,
      surchargePercent,
      settled: remainingInstallments === 0,
    }
  }

  // Otorgado (y el caso degenerado de un tomado sin plan): lo que falta es plata.
  const outstanding = Math.max(0, loan.principal - repaid)
  return {
    totalToRepay,
    repaid,
    outstanding,
    paidInstallments,
    remainingInstallments: hasPlan
      ? Math.max(0, loan.installments! - paidInstallments)
      : null,
    surchargePercent,
    settled: outstanding === 0,
  }
}

export interface LoanTotals {
  /** Lo que se debe. Resta del patrimonio. */
  debt: number
  /** Lo que está prestado y falta cobrar. Suma al patrimonio: es plata tuya, en otro lado. */
  receivable: number
}

/**
 * Lo que los préstamos le hacen al patrimonio.
 *
 * Es la primera vez que algo **resta**: hasta acá el patrimonio era billeteras
 * más tenencias, todo positivo. Prestarle plata a alguien no te hace más pobre,
 * te hace menos líquido — por eso una acreencia suma y una deuda resta.
 */
export function loanTotals(
  loans: readonly Loan[],
  repaymentsByLoan: Readonly<Record<string, LoanRepayment[]>>,
): LoanTotals {
  let debt = 0
  let receivable = 0

  for (const loan of loans) {
    const { outstanding } = loanProgress(loan, repaymentsByLoan[loan.id] ?? [])
    if (loan.direction === 'tomado') debt += outstanding
    else receivable += outstanding
  }

  return { debt, receivable }
}

/**
 * El vencimiento siguiente, un mes después.
 *
 * Un préstamo que vence el 31 de enero vence el 28 de febrero, no el 3 de
 * marzo: `new Date(2026, 1, 31)` se desborda solo al mes siguiente y correría
 * la fecha para siempre. Se recorta al último día del mes destino.
 */
export function nextDueDate(current: string, monthsAhead = 1): string {
  const [y, m, d] = current.split('-').map(Number)
  const targetMonth = m - 1 + monthsAhead
  const year = y + Math.floor(targetMonth / 12)
  const month = ((targetMonth % 12) + 12) % 12

  const lastDayOfTarget = new Date(year, month + 1, 0).getDate()
  const day = Math.min(d, lastDayOfTarget)

  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Días hasta el vencimiento. Negativo si ya venció. */
export function daysUntilDue(dueDate: string, today: string): number {
  const due = new Date(`${dueDate}T12:00:00`).getTime()
  const now = new Date(`${today}T12:00:00`).getTime()
  return Math.round((due - now) / 86_400_000)
}
