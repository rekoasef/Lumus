import { describe, expect, it } from 'vitest'
import {
  daysUntilDue,
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

  it('el pendiente sale de las cuotas que faltan, no de la plata pagada', () => {
    // Alguien paga de menos: debe seguir debiendo 17 cuotas enteras, no
    // "810.000 − 20.000". Lo que se pactó son cuotas.
    const p = loanProgress(loan(), pagos(20_000))
    expect(p.repaid).toBe(20_000)
    expect(p.outstanding).toBe(765_000)
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
