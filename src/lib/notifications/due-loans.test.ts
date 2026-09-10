import { describe, expect, it } from 'vitest'
import { buildLoanDueNotification, selectLoanDueNotices, type LoanDue } from './due-loans'
import { dueDedupeKey } from './due-recurring'

const HOY = '2026-09-10'

function loan(overrides: Partial<LoanDue> = {}): LoanDue {
  return {
    id: 'l1',
    user_id: 'u1',
    counterparty: 'Banco Nación',
    installment_amount: 45_000,
    next_due_date: '2026-09-12',
    ...overrides,
  }
}

describe('selectLoanDueNotices', () => {
  it('avisa lo que vence dentro de la ventana', () => {
    expect(selectLoanDueNotices([loan()], HOY)).toHaveLength(1)
  })

  it('no avisa lo que vence más adelante', () => {
    expect(selectLoanDueNotices([loan({ next_due_date: '2026-10-10' })], HOY)).toHaveLength(0)
  })

  it('avisa lo ya vencido', () => {
    const [notice] = selectLoanDueNotices([loan({ next_due_date: '2026-09-05' })], HOY)
    expect(notice.phase).toBe('vencido')
    expect(notice.daysUntil).toBe(-5)
  })

  it('un préstamo sin fecha no genera aviso', () => {
    // Es el caso del préstamo que diste: te devuelven cuando pueden.
    expect(selectLoanDueNotices([loan({ next_due_date: null })], HOY)).toHaveLength(0)
  })

  it('lo más urgente primero', () => {
    const notices = selectLoanDueNotices(
      [
        loan({ id: 'a', next_due_date: '2026-09-12' }),
        loan({ id: 'b', next_due_date: '2026-09-08' }),
        loan({ id: 'c', next_due_date: '2026-09-10' }),
      ],
      HOY,
    )
    expect(notices.map(n => n.loan.id)).toEqual(['b', 'c', 'a'])
  })

  it('el dedupe_key no colisiona con el de un recurrente del mismo id', () => {
    // `notifications` tiene `unique (user_id, dedupe_key)`: si los prefijos
    // fueran iguales, uno de los dos avisos desaparecería sin error.
    const [notice] = selectLoanDueNotices([loan({ id: 'x' })], HOY)
    expect(notice.dedupeKey).not.toBe(dueDedupeKey('x', '2026-09-12', 'proximo'))
  })

  it('el mismo vencimiento en la misma fase da siempre la misma clave', () => {
    const once  = selectLoanDueNotices([loan()], HOY)[0].dedupeKey
    const twice = selectLoanDueNotices([loan()], HOY)[0].dedupeKey
    expect(once).toBe(twice)
  })

  it('pasar de próximo a vencido cambia la clave, así que se avisa de nuevo', () => {
    const proximo = selectLoanDueNotices([loan({ next_due_date: '2026-09-12' })], HOY)[0]
    const vencido = selectLoanDueNotices([loan({ next_due_date: '2026-09-12' })], '2026-09-14')[0]
    expect(proximo.dedupeKey).not.toBe(vencido.dedupeKey)
  })
})

describe('buildLoanDueNotification', () => {
  it('dice de quién es la cuota y cuánto', () => {
    const notice = selectLoanDueNotices([loan()], HOY)[0]
    const aviso = buildLoanDueNotification(notice)

    expect(aviso.title).toBe('Cuota de Banco Nación')
    expect(aviso.body).toContain('Vence en 2 días')
    expect(aviso.body).toContain('45')
    expect(aviso.link).toBe('/finanzas/prestamos')
    expect(aviso.type).toBe('vencimiento')
  })

  it('sin valor de cuota no inventa un monto', () => {
    const notice = selectLoanDueNotices([loan({ installment_amount: null })], HOY)[0]
    expect(buildLoanDueNotification(notice).body).toBe('Vence en 2 días')
  })

  it('lo vencido se lee como vencido, no como "en -1 días"', () => {
    const notice = selectLoanDueNotices([loan({ next_due_date: '2026-09-09' })], HOY)[0]
    expect(buildLoanDueNotification(notice).body).toContain('Venció ayer')
  })
})
