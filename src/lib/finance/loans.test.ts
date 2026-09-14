import { describe, expect, it } from 'vitest'
import {
  daysUntilDue,
  loanMovementRole,
  loanProgress,
  loanTotals,
  nextDueDate,
  type Loan,
  type LoanRepayment,
} from './loans'

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'l1',
    direction: 'tomado',
    counterparty: 'Banco Nación',
    wallet_id: 'w1',
    category_id: null,
    principal: 500_000,
    installments: 18,
    installment_amount: 45_000,
    next_due_date: '2026-10-10',
    started_on: '2026-09-10',
    notes: null,
    ...overrides,
  }
}

function pagos(...amounts: number[]): LoanRepayment[] {
  return amounts.map((amount, i) => ({ id: `p${i}`, amount, date: '2026-10-10' }))
}

describe('loanMovementRole — qué es cada movimiento del préstamo', () => {
  it('en un préstamo tomado, la plata que entra es el desembolso', () => {
    expect(loanMovementRole('tomado', 'prestamo', 1_000_000)).toBe('desembolso')
  })

  it('en un préstamo tomado, la cuota es un gasto', () => {
    expect(loanMovementRole('tomado', 'gasto', 200_000)).toBe('devolucion')
  })

  it('en un préstamo otorgado, la plata que sale es el desembolso', () => {
    expect(loanMovementRole('otorgado', 'prestamo', -200_000)).toBe('desembolso')
  })

  it('en un préstamo otorgado, el cobro es plata que vuelve', () => {
    expect(loanMovementRole('otorgado', 'prestamo', 50_000)).toBe('devolucion')
  })

  // El mismo par (tipo, signo) significa cosas opuestas según la dirección: sin
  // mirarla, el cobro de un otorgado se confundiría con el desembolso de un
  // tomado y el candado dejaría borrar justo lo que tiene que proteger.
  it('el mismo movimiento cambia de papel según la dirección', () => {
    expect(loanMovementRole('tomado', 'prestamo', 1_000_000)).toBe('desembolso')
    expect(loanMovementRole('otorgado', 'prestamo', 1_000_000)).toBe('devolucion')
  })

  it('un tipo que no pinta en un préstamo no cuenta como devolución', () => {
    expect(loanMovementRole('tomado', 'ingreso', 200_000)).toBe('otro')
    expect(loanMovementRole('tomado', 'ajuste', -5_000)).toBe('otro')
    expect(loanMovementRole('otorgado', 'gasto', 200_000)).toBe('otro')
  })
})

describe('loanProgress — préstamo tomado', () => {
  it('sin pagos, se debe el total de las cuotas y no el capital', () => {
    const p = loanProgress(loan(), [])
    expect(p.totalToRepay).toBe(810_000)
    expect(p.outstanding).toBe(810_000)
    expect(p.remainingInstallments).toBe(18)
    expect(p.settled).toBe(false)
  })

  it('el sobrecosto es aritmética sobre lo recibido', () => {
    // 810.000 sobre 500.000 recibidos = 62% más.
    expect(loanProgress(loan(), []).surchargePercent).toBeCloseTo(62, 5)
  })

  it('cada pago registrado descuenta una cuota', () => {
    const p = loanProgress(loan(), pagos(45_000, 45_000, 45_000))
    expect(p.paidInstallments).toBe(3)
    expect(p.remainingInstallments).toBe(15)
    expect(p.outstanding).toBe(675_000)
    expect(p.repaid).toBe(135_000)
  })

  // ── Los casos en que el monto no es el valor de la cuota ────────────────
  // Todos comparten la misma prueba: la deuda tiene que bajar exactamente lo
  // que bajó la plata, o el patrimonio miente por la diferencia.

  it('pagar de menos deja debiendo lo que falta, no la cuota entera', () => {
    // 20.000 de una cuota de 45.000. Antes descontaba la cuota completa y la
    // deuda bajaba 45.000 mientras del bolsillo salían 20.000.
    const p = loanProgress(loan(), pagos(20_000))
    expect(p.repaid).toBe(20_000)
    expect(p.outstanding).toBe(790_000)
    expect(p.remainingInstallments).toBe(18)   // ninguna cuota completa todavía
    expect(p.paidInstallments).toBe(0)
  })

  it('dos cuotas juntas en un solo pago cuentan dos', () => {
    const p = loanProgress(loan(), pagos(90_000))
    expect(p.outstanding).toBe(720_000)
    expect(p.paidInstallments).toBe(2)
    expect(p.remainingInstallments).toBe(16)
  })

  it('pagar de más descuenta de más, sin adivinar cuotas de regalo', () => {
    const p = loanProgress(loan(), pagos(60_000))
    expect(p.outstanding).toBe(750_000)
    expect(p.paidInstallments).toBe(1)
    expect(p.remainingInstallments).toBe(17)
  })

  it('cancelar todo de una vez lo deja saldado', () => {
    // El caso que rompía: un pago por el total dejaba la deuda en 765.000 y el
    // préstamo sin forma de cerrarse salvo registrando 18 cuotas.
    const p = loanProgress(loan(), pagos(810_000))
    expect(p.outstanding).toBe(0)
    expect(p.settled).toBe(true)
    expect(p.paidInstallments).toBe(18)
  })

  it('pagadas todas las cuotas queda saldado y no en negativo', () => {
    const p = loanProgress(loan({ installments: 3, installment_amount: 45_000 }), pagos(45_000, 45_000, 45_000, 45_000))
    expect(p.remainingInstallments).toBe(0)
    expect(p.outstanding).toBe(0)
    expect(p.settled).toBe(true)
  })

  it('sin interés, el sobrecosto es cero y no null', () => {
    const p = loanProgress(loan({ principal: 90_000, installments: 3, installment_amount: 30_000 }), [])
    expect(p.surchargePercent).toBe(0)
  })
})

describe('loanProgress — préstamo otorgado', () => {
  const prestado = loan({
    id: 'l2',
    direction: 'otorgado',
    counterparty: 'Juan',
    principal: 200_000,
    installments: null,
    installment_amount: null,
  })

  it('sin cuotas pactadas, lo que falta es plata', () => {
    const p = loanProgress(prestado, [])
    expect(p.outstanding).toBe(200_000)
    expect(p.totalToRepay).toBeNull()
    expect(p.surchargePercent).toBeNull()
    expect(p.remainingInstallments).toBeNull()
  })

  it('un cobro parcial descuenta exactamente lo cobrado', () => {
    const p = loanProgress(prestado, pagos(50_000))
    expect(p.repaid).toBe(50_000)
    expect(p.outstanding).toBe(150_000)
    expect(p.settled).toBe(false)
  })

  it('cobrado todo queda saldado', () => {
    expect(loanProgress(prestado, pagos(50_000, 150_000)).settled).toBe(true)
  })

  it('si devuelven de más no queda un pendiente negativo', () => {
    expect(loanProgress(prestado, pagos(250_000)).outstanding).toBe(0)
  })

  it('con cuotas pactadas igual se mide en plata: el que devuelve paga lo que puede', () => {
    const conPlan = loan({
      direction: 'otorgado',
      principal: 200_000,
      installments: 4,
      installment_amount: 50_000,
    })
    // Una cuota registrada de 10.000 no cancela 50.000 de acreencia.
    const p = loanProgress(conPlan, pagos(10_000))
    expect(p.outstanding).toBe(190_000)
    expect(p.remainingInstallments).toBe(3)
  })
})

describe('loanTotals — lo que le hace al patrimonio', () => {
  it('separa lo que se debe de lo que falta cobrar', () => {
    const tomado = loan({ id: 'a', installments: 10, installment_amount: 50_000 })
    const otorgado = loan({
      id: 'b',
      direction: 'otorgado',
      principal: 200_000,
      installments: null,
      installment_amount: null,
    })

    const totals = loanTotals([tomado, otorgado], {
      a: pagos(50_000, 50_000),
      b: pagos(50_000),
    })

    expect(totals.debt).toBe(400_000)      // 8 cuotas de 50.000
    expect(totals.receivable).toBe(150_000) // 200.000 − 50.000
  })

  it('un préstamo saldado deja de pesar en el patrimonio', () => {
    const saldado = loan({ id: 'a', installments: 2, installment_amount: 50_000 })
    expect(loanTotals([saldado], { a: pagos(50_000, 50_000) })).toEqual({ debt: 0, receivable: 0 })
  })

  it('sin préstamos, todo en cero', () => {
    expect(loanTotals([], {})).toEqual({ debt: 0, receivable: 0 })
  })
})

describe('nextDueDate', () => {
  it('avanza un mes', () => {
    expect(nextDueDate('2026-09-10')).toBe('2026-10-10')
  })

  it('cruza el año', () => {
    expect(nextDueDate('2026-12-05')).toBe('2027-01-05')
  })

  it('el 31 de enero vence el 28 de febrero, no el 3 de marzo', () => {
    // `new Date(2026, 1, 31)` se desborda a marzo y correría la fecha para siempre.
    expect(nextDueDate('2026-01-31')).toBe('2026-02-28')
  })

  it('respeta el año bisiesto', () => {
    expect(nextDueDate('2028-01-31')).toBe('2028-02-29')
  })

  it('no arrastra el recorte: marzo vuelve a tener 31', () => {
    expect(nextDueDate('2026-01-31', 2)).toBe('2026-03-31')
  })

  it('acepta saltos de varios meses', () => {
    expect(nextDueDate('2026-09-10', 12)).toBe('2027-09-10')
  })
})

describe('daysUntilDue', () => {
  it('cuenta los días que faltan', () => {
    expect(daysUntilDue('2026-09-13', '2026-09-10')).toBe(3)
  })

  it('vence hoy', () => {
    expect(daysUntilDue('2026-09-10', '2026-09-10')).toBe(0)
  })

  it('ya vencido da negativo', () => {
    expect(daysUntilDue('2026-09-08', '2026-09-10')).toBe(-2)
  })

  it('no se corre por el cambio de horario de verano', () => {
    expect(daysUntilDue('2026-11-10', '2026-10-10')).toBe(31)
  })
})

/**
 * La invariante que sostiene todo el módulo.
 *
 * El patrimonio que muestra un préstamo es `efectivo − deuda`. Las dos mitades
 * se mueven por caminos distintos —la plata por el monto que se registra, la
 * deuda por `loanProgress`— y la única forma de que no mientan es que se muevan
 * juntas. Mientras no haya interés nuevo ni plata regalada, pagar **no cambia
 * el patrimonio**: cambia de qué lado está.
 *
 * Cada caso de acá abajo es un escenario que en producción daba distinto.
 */
describe('invariante: pagar no cambia el patrimonio', () => {
  const PRINCIPAL = 1_000_000
  const CUOTA = 200_000
  const TOTAL = 1_200_000          // 6 cuotas: el interés son 200.000

  const prestamo = loan({
    principal: PRINCIPAL,
    installments: 6,
    installment_amount: CUOTA,
  })

  /** Lo que muestra la app: el efectivo que quedó menos lo que dice que se debe. */
  function patrimonio(...montos: number[]): number {
    const repayments = pagos(...montos)
    const efectivo = PRINCIPAL - montos.reduce((s, m) => s + m, 0)
    return efectivo - loanProgress(prestamo, repayments).outstanding
  }

  // El interés se reconoce entero al sacar el préstamo (migración 00029), así
  // que el patrimonio arranca en −200.000 y no se mueve más.
  const ESPERADO = PRINCIPAL - TOTAL

  it('sin pagar nada', () => {
    expect(patrimonio()).toBe(ESPERADO)
  })

  it('con cuotas exactas', () => {
    expect(patrimonio(CUOTA)).toBe(ESPERADO)
    expect(patrimonio(CUOTA, CUOTA, CUOTA)).toBe(ESPERADO)
    expect(patrimonio(...Array(6).fill(CUOTA))).toBe(ESPERADO)
  })

  it('con dos cuotas juntas en un solo registro', () => {
    expect(patrimonio(400_000)).toBe(ESPERADO)
  })

  it('pagando de más', () => {
    expect(patrimonio(300_000)).toBe(ESPERADO)
  })

  it('pagando de menos', () => {
    expect(patrimonio(100_000)).toBe(ESPERADO)
  })

  it('cancelando todo de una vez', () => {
    expect(patrimonio(TOTAL)).toBe(ESPERADO)
  })

  it('mezclando montos irregulares', () => {
    expect(patrimonio(150_000, 350_000, 200_000, 12_345)).toBe(ESPERADO)
  })

  // Pagar más que el total sí baja el patrimonio: esa plata se fue y ya no se
  // debía. No es un bug, es plata regalada.
  it('pagando más que el total, la diferencia se pierde de verdad', () => {
    expect(patrimonio(1_500_000)).toBe(PRINCIPAL - 1_500_000)
  })
})
