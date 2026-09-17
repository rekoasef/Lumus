import { describe, expect, it } from 'vitest'
import { monthInArgentina, previousMonth, reportBlock, reportableMonth } from './report-availability'

// 17 de septiembre de 2026, 21:26 en Argentina (UTC-3).
const NOW = new Date('2026-09-18T00:26:00Z')

describe('monthInArgentina', () => {
  it('usa la hora de Argentina, no la del servidor', () => {
    // 1° de octubre 00:30 UTC es todavía 30 de septiembre acá.
    expect(monthInArgentina(new Date('2026-10-01T00:30:00Z'))).toBe('2026-09')
    // 03:30 UTC ya es 1° de octubre acá.
    expect(monthInArgentina(new Date('2026-10-01T03:30:00Z'))).toBe('2026-10')
  })
})

describe('previousMonth', () => {
  it('cruza el año', () => {
    expect(previousMonth('2026-01')).toBe('2025-12')
    expect(previousMonth('2026-10')).toBe('2026-09')
  })
})

describe('reportableMonth', () => {
  it('es el último mes cerrado', () => {
    expect(reportableMonth(NOW)).toBe('2026-08')
  })
})

describe('reportBlock', () => {
  const base = { accountCreatedAt: '2026-01-10T12:00:00Z', movements: 12, now: NOW }

  it('deja generar el informe de un mes cerrado, con movimientos y con la cuenta ya creada', () => {
    expect(reportBlock({ ...base, month: '2026-08' })).toBeNull()
  })

  it('no deja generar el mes en curso ni uno futuro', () => {
    expect(reportBlock({ ...base, month: '2026-09' })).toBe('mes_sin_cerrar')
    expect(reportBlock({ ...base, month: '2026-10' })).toBe('mes_sin_cerrar')
  })

  // El bug que originó el módulo: cuenta creada el 17 de septiembre, informe de
  // agosto ofrecido el mismo día.
  it('no ofrece un mes anterior a la cuenta', () => {
    const recien = { ...base, accountCreatedAt: '2026-09-17T18:00:00Z' }
    expect(reportBlock({ ...recien, month: '2026-08' })).toBe('antes_de_la_cuenta')
  })

  it('el primer informe es el del mes en que se registró, una vez cerrado', () => {
    const creada = '2026-09-17T18:00:00Z'
    // Todavía en septiembre: no hay ningún mes para pedir.
    expect(reportBlock({ month: '2026-09', accountCreatedAt: creada, movements: 5, now: NOW }))
      .toBe('mes_sin_cerrar')
    // 1° de octubre: septiembre ya cerró y la cuenta existía.
    const octubre = new Date('2026-10-01T12:00:00Z')
    expect(reportBlock({ month: '2026-09', accountCreatedAt: creada, movements: 5, now: octubre }))
      .toBeNull()
  })

  it('una cuenta creada el 1° de noviembre recién genera el 1° de diciembre', () => {
    const creada = '2026-11-01T09:00:00Z'
    const noviembre = new Date('2026-11-20T12:00:00Z')
    expect(reportBlock({ month: '2026-10', accountCreatedAt: creada, movements: 3, now: noviembre }))
      .toBe('antes_de_la_cuenta')
    const diciembre = new Date('2026-12-01T12:00:00Z')
    expect(reportBlock({ month: '2026-11', accountCreatedAt: creada, movements: 3, now: diciembre }))
      .toBeNull()
  })

  it('cuenta el mes del registro por la hora de Argentina', () => {
    // 1° de noviembre 01:00 UTC: en Argentina todavía es 31 de octubre, así que
    // la cuenta es de octubre y octubre sí se le puede informar.
    const creada = '2026-11-01T01:00:00Z'
    const noviembre = new Date('2026-11-05T12:00:00Z')
    expect(reportBlock({ month: '2026-10', accountCreatedAt: creada, movements: 3, now: noviembre }))
      .toBeNull()
  })

  it('no gasta una llamada paga en un mes sin movimientos', () => {
    expect(reportBlock({ ...base, month: '2026-08', movements: 0 })).toBe('sin_movimientos')
  })
})
