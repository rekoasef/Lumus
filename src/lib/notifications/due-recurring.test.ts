import { describe, it, expect } from 'vitest'
import { daysBetween, dueDedupeKey, selectDueNotices, type RecurringDue } from './due-recurring'

function recurring(overrides: Partial<RecurringDue> = {}): RecurringDue {
  return {
    id: 'rec-1',
    user_id: 'user-1',
    description: 'Seguro de la moto',
    amount: 45000,
    type: 'gasto',
    repeat_type: 'monthly',
    next_date: '2026-09-01',
    active: true,
    ...overrides,
  }
}

describe('daysBetween', () => {
  it('cuenta los días entre dos fechas', () => {
    expect(daysBetween('2026-08-27', '2026-08-30')).toBe(3)
    expect(daysBetween('2026-08-27', '2026-08-27')).toBe(0)
    expect(daysBetween('2026-08-27', '2026-08-25')).toBe(-2)
  })

  it('cruza fin de mes y fin de año sin desviarse', () => {
    expect(daysBetween('2026-08-30', '2026-09-02')).toBe(3)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })

  it('no se corre un día por el cambio de horario de verano', () => {
    // Con fechas locales en vez de UTC, un cruce de DST devuelve 0,96 días y
    // Math.round lo tapa hasta que no lo tapa.
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1)
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
  })
})

describe('selectDueNotices', () => {
  const today = '2026-08-27'

  it('avisa lo que vence dentro de los próximos 3 días', () => {
    const notices = selectDueNotices([recurring({ next_date: '2026-08-30' })], today)

    expect(notices).toHaveLength(1)
    expect(notices[0].phase).toBe('proximo')
    expect(notices[0].daysUntil).toBe(3)
  })

  it('no avisa lo que vence más allá de esa ventana', () => {
    expect(selectDueNotices([recurring({ next_date: '2026-08-31' })], today)).toHaveLength(0)
  })

  it('avisa lo que vence hoy como próximo, no como vencido', () => {
    const notices = selectDueNotices([recurring({ next_date: today })], today)

    expect(notices[0].phase).toBe('proximo')
    expect(notices[0].daysUntil).toBe(0)
  })

  it('marca como vencido lo que ya pasó', () => {
    const notices = selectDueNotices([recurring({ next_date: '2026-08-20' })], today)

    expect(notices[0].phase).toBe('vencido')
    expect(notices[0].daysUntil).toBe(-7)
  })

  it('ignora los recurrentes desactivados', () => {
    expect(selectDueNotices([recurring({ active: false, next_date: today })], today)).toHaveLength(0)
  })

  it('ordena lo más urgente primero', () => {
    const notices = selectDueNotices([
      recurring({ id: 'a', next_date: '2026-08-29' }),
      recurring({ id: 'b', next_date: '2026-08-24' }),
      recurring({ id: 'c', next_date: '2026-08-27' }),
    ], today)

    expect(notices.map(n => n.recurring.id)).toEqual(['b', 'c', 'a'])
  })

  it('el mismo vencimiento en la misma fase da siempre la misma clave', () => {
    // Es lo que hace idempotente al cron: la clave choca contra el unique de
    // la base y el aviso no se manda dos veces.
    const first = selectDueNotices([recurring({ next_date: '2026-08-29' })], today)
    const second = selectDueNotices([recurring({ next_date: '2026-08-29' })], '2026-08-28')

    expect(first[0].dedupeKey).toBe(second[0].dedupeKey)
    expect(first[0].dedupeKey).toBe(dueDedupeKey('rec-1', '2026-08-29', 'proximo'))
  })

  it('vencido y por vencer son avisos distintos del mismo cargo', () => {
    const soon = selectDueNotices([recurring({ next_date: '2026-08-28' })], today)
    const overdue = selectDueNotices([recurring({ next_date: '2026-08-28' })], '2026-08-30')

    expect(soon[0].dedupeKey).not.toBe(overdue[0].dedupeKey)
  })
})
