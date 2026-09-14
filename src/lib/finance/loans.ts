/**
 * La aritmética de los préstamos.
 *
 * Vive acá y no en un componente por la misma razón que `rules.ts`: cuánto se
 * debe es una regla de negocio, y una regla escrita dos veces termina mostrando
 * dos números distintos en dos pantallas. Ya pasó con el progreso de una meta.
 */

export type LoanDirection = 'tomado' | 'otorgado'

/**
 * Qué papel juega un movimiento dentro de su préstamo.
 *
 * - `desembolso`: la plata que se recibió (tomado) o se entregó (otorgado). Es
 *   la mitad que **compensa** a la deuda o a la acreencia.
 * - `devolucion`: una cuota pagada o un cobro recibido.
 * - `otro`: cualquier otra cosa atada al préstamo. No debería existir; está
 *   para que un tipo nuevo no se cuele como devolución sin que nadie lo mire.
 */
export type LoanMovementRole = 'desembolso' | 'devolucion' | 'otro'

/**
 * Cómo se distingue el desembolso de una devolución.
 *
 * No por el orden ni por la fecha —dos movimientos del mismo día no tienen un
 * orden confiable— sino por el tipo y el signo, que están determinados por la
 * dirección del préstamo:
 *
 *   tomado    desembolso = `prestamo` (+)   ·  cuota = `gasto`
 *   otorgado  desembolso = `prestamo` (−)   ·  cobro = `prestamo` (+)
 *
 * La regla vive acá y no en la API porque la usan dos lados que **tienen que
 * coincidir**: el cálculo de cuánto se debe y el candado que impide borrar el
 * desembolso desde la lista de movimientos. Si se separaran, habría una
 * pantalla dejando borrar justo lo que la otra necesita para no mentir.
 *
 * `type` entra como `string` y no como `TransactionType` porque en la base es
 * una columna `text`: así se lee tal cual viene, sin castearla en cada llamada.
 * Lo que no reconoce cae en `otro`, que no cuenta para nada.
 */
export function loanMovementRole(
  direction: LoanDirection,
  type: string,
  amount: number,
): LoanMovementRole {
  if (direction === 'tomado') {
    if (type === 'prestamo' && amount > 0) return 'desembolso'
    if (type === 'gasto') return 'devolucion'
    return 'otro'
  }

  if (type === 'prestamo') return amount < 0 ? 'desembolso' : 'devolucion'
  return 'otro'
}

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
  /**
   * Cuántas cuotas se cubrieron. En un préstamo tomado sale de la plata pagada
   * —dos cuotas juntas cuentan dos— y no de cuántos pagos se registraron. En
   * uno otorgado, donde no hay contrato, es la cantidad de cobros.
   */
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
 * ── Lo que falta se mide en plata, siempre ──
 *
 * Hasta el 2026-09-14 la deuda de un préstamo tomado se calculaba contando
 * **registros**: cuotas restantes × valor de cuota. La plata, en cambio, se
 * mueve por el monto que la persona escribe. Cada vez que ese monto no era
 * exactamente el valor de la cuota, las dos mitades se separaban:
 *
 *   pagás 400.000 de una (dos cuotas)  → la deuda bajaba 200.000. Mentía 200.000
 *   pagás 300.000 en vez de 200.000    → la deuda bajaba 200.000. Mentía 100.000
 *   cancelás todo con un pago de 1,2M  → la deuda bajaba 200.000. Mentía 1.000.000
 *
 * El último es el que muestra por qué no alcanzaba con pedirle a la gente que
 * registre una cuota por vez: pagabas el préstamo entero y la app te seguía
 * diciendo que debías un millón, sin forma de darlo por saldado.
 *
 * Así que la deuda es `total a devolver − lo pagado`, que no puede separarse de
 * la plata porque **es** la plata. El camino normal —cuotas exactas— da
 * idéntico a como daba antes; solo cambian los casos que mentían.
 *
 * Sigue valiendo la decisión del dueño (2026-09-10) de que el pendiente
 * **incluye el interés futuro**: está adentro de `total a devolver`.
 *
 * Un préstamo **otorgado** no tiene contrato: le prestaste a un amigo y te paga
 * cuando puede. "En cuántas cuotas te lo devuelven" es una ficción que nadie
 * completa con la verdad, así que lo que falta es `prestado − cobrado` y las
 * cuotas, si se cargaron, son solo el plan esperado. Siempre se midió así: el
 * arreglo de arriba es, justamente, que las dos direcciones ahora cuentan igual.
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
    const outstanding = Math.max(0, totalToRepay! - repaid)

    // Las cuotas que se muestran salen de la plata que falta, no de cuántas
    // veces se apretó "Registrar": así pagar dos juntas se lee como dos cuotas
    // sin pedirle a nadie que las cargue por separado. Va con `ceil` porque una
    // cuota a medio pagar es una cuota que falta.
    const remainingInstallments = Math.ceil(outstanding / loan.installment_amount!)

    return {
      totalToRepay,
      repaid,
      outstanding,
      paidInstallments: loan.installments! - remainingInstallments,
      remainingInstallments,
      surchargePercent,
      settled: outstanding === 0,
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
