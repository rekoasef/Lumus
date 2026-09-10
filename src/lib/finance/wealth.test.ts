import { describe, it, expect } from 'vitest'
import { monthsOfRunway, pesoLossOverWindows, wealthComposition } from './wealth'

describe('wealthComposition', () => {
  it('suma las tres partes y calcula la exposición al peso', () => {
    const c = wealthComposition(800_000, 150_000, 50_000)

    expect(c.totalArs).toBe(1_000_000)
    expect(c.pesoExposurePercent).toBe(80)
  })

  it('sin patrimonio no divide por cero', () => {
    expect(wealthComposition(0, 0, 0).pesoExposurePercent).toBe(0)
  })

  it('todo en dólares es 0% de exposición al peso', () => {
    expect(wealthComposition(0, 500_000, 0).pesoExposurePercent).toBe(0)
  })

  it('la deuda no cambia lo que se tiene, cambia lo que se es', () => {
    const c = wealthComposition(800_000, 150_000, 50_000, 0, 600_000)

    expect(c.totalArs).toBe(1_000_000)
    expect(c.netArs).toBe(400_000)
  })

  it('lo que te deben suma al patrimonio: es plata tuya, en otro lado', () => {
    const c = wealthComposition(800_000, 0, 0, 200_000, 0)

    expect(c.totalArs).toBe(1_000_000)
    expect(c.netArs).toBe(1_000_000)
  })

  it('deber más de lo que tenés da patrimonio negativo, no cero', () => {
    // Es una situación real y esconderla sería la mentira que este cambio
    // vino a evitar.
    expect(wealthComposition(100_000, 0, 0, 0, 500_000).netArs).toBe(-400_000)
  })

  it('la exposición al peso se mide contra los activos, no contra el neto', () => {
    // Con deuda, medir contra el neto daría porcentajes por encima de 100.
    const c = wealthComposition(800_000, 200_000, 0, 0, 900_000)
    expect(c.pesoExposurePercent).toBe(80)
  })
})

describe('monthsOfRunway', () => {
  it('cuenta cuántos meses cubre lo líquido', () => {
    expect(monthsOfRunway(600_000, 100_000)).toBe(6)
  })

  it('sin gastos conocidos no inventa un número', () => {
    // Decir "te alcanza para infinitos meses" es peor que no decir nada.
    expect(monthsOfRunway(600_000, 0)).toBeNull()
  })
})

describe('pesoLossOverWindows', () => {
  it('mide la pérdida en cada ventana', () => {
    const changes = pesoLossOverWindows(1500, [
      { label: '30 días', rateThen: 1400 },
      { label: '1 año', rateThen: 1000 },
    ])

    expect(changes[0].percent).toBeCloseTo(-6.67, 2)
    expect(changes[1].percent).toBeCloseTo(-33.33, 2)
  })

  it('una ventana sin cotización se saltea en vez de dar cero', () => {
    const changes = pesoLossOverWindows(1500, [
      { label: '30 días', rateThen: 1400 },
      { label: '5 años', rateThen: null },
    ])

    expect(changes).toHaveLength(1)
    expect(changes[0].label).toBe('30 días')
  })

  it('si el peso ganó, el número es positivo', () => {
    expect(pesoLossOverWindows(1000, [{ label: 'x', rateThen: 1100 }])[0].percent).toBeCloseTo(10, 2)
  })
})
