import { describe, it, expect } from 'vitest'
import { purchasingPowerChange, rateOn, toUsdOn, type DailyRate } from './purchasing-power'

const RATES: DailyRate[] = [
  { date: '2026-08-21', usd: 1500 },  // viernes
  { date: '2026-08-24', usd: 1520 },
  { date: '2026-08-25', usd: 1530 },
  { date: '2026-08-27', usd: 1538 },
]

describe('purchasingPowerChange', () => {
  it('si el dólar sube, tus pesos quietos perdieron', () => {
    const change = purchasingPowerChange(1_000_000, 1000, 1100)

    expect(change?.lost).toBe(true)
    expect(change?.percent).toBeCloseTo(-9.09, 2)
    expect(change?.usdBefore).toBeCloseTo(1000, 2)
    expect(change?.usdNow).toBeCloseTo(909.09, 2)
  })

  it('si el dólar baja, tus pesos quietos ganaron', () => {
    const change = purchasingPowerChange(1_000_000, 1100, 1000)

    expect(change?.lost).toBe(false)
    expect(change?.percent).toBeCloseTo(10, 2)
  })

  it('sin movimiento del dólar no hay ni pérdida ni ganancia', () => {
    const change = purchasingPowerChange(1_000_000, 1500, 1500)

    expect(change?.percent).toBe(0)
    expect(change?.amountArs).toBe(0)
  })

  it('expresa la pérdida en pesos de hoy', () => {
    // 1.000.000 a 1000 eran 1000 USD; a 1100 son 909,09 USD.
    // La diferencia, 90,91 USD, son 100.000 pesos de hoy.
    const change = purchasingPowerChange(1_000_000, 1000, 1100)

    expect(change?.amountArs).toBeCloseTo(-100_000, 0)
  })

  it('no inventa un resultado con cotizaciones inválidas', () => {
    expect(purchasingPowerChange(1000, 0, 1500)).toBeNull()
    expect(purchasingPowerChange(1000, 1500, 0)).toBeNull()
  })
})

describe('rateOn', () => {
  it('devuelve la cotización exacta si existe', () => {
    expect(rateOn(RATES, '2026-08-25')).toBe(1530)
  })

  it('un domingo usa la del último día hábil, no la del lunes siguiente', () => {
    // Valuar una fecha con una cotización que todavía no había pasado sería
    // mirar el futuro.
    expect(rateOn(RATES, '2026-08-23')).toBe(1500)
    expect(rateOn(RATES, '2026-08-26')).toBe(1530)
  })

  it('antes del primer dato no hay cotización', () => {
    expect(rateOn(RATES, '2010-01-01')).toBeNull()
  })

  it('después del último dato usa el último', () => {
    expect(rateOn(RATES, '2026-12-31')).toBe(1538)
  })
})

describe('toUsdOn', () => {
  it('convierte con la cotización del día', () => {
    expect(toUsdOn(1_530_000, RATES, '2026-08-25')).toBeCloseTo(1000, 2)
  })

  it('sin cotización devuelve null en vez de un número cualquiera', () => {
    expect(toUsdOn(1000, RATES, '2010-01-01')).toBeNull()
  })
})
