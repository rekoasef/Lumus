import { describe, it, expect } from 'vitest'
import { costInUsd, portfolioTotals, resolvePriceUsd, valuateHolding, type Holding } from './holdings'
import type { DailyRate } from './purchasing-power'

const RATES: DailyRate[] = [
  { date: '2024-06-03', usd: 1000 },
  { date: '2026-08-27', usd: 1500 },
]

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: 'h1',
    name: 'Bitcoin',
    kind: 'cripto',
    price_source: 'bitcoin',
    quantity: 0.5,
    purchase_price: 60000,
    purchase_currency: 'USD',
    purchase_date: '2024-06-03',
    manual_price: null,
    ...overrides,
  }
}

describe('costInUsd', () => {
  it('una compra en dólares es directa', () => {
    expect(costInUsd(holding(), RATES)).toBe(30000)
  })

  it('una compra en pesos usa la cotización del día que compraste', () => {
    // 500.000 pesos a 1000 en 2024 son 500 dólares. Con la cotización de hoy
    // (1500) darían 333, y la tenencia parecería una ganancia que no existió.
    const cost = costInUsd(holding({
      quantity: 1,
      purchase_price: 500_000,
      purchase_currency: 'ARS',
      purchase_date: '2024-06-03',
    }), RATES)

    expect(cost).toBe(500)
  })

  it('sin cotización de esa fecha no inventa el costo', () => {
    const cost = costInUsd(holding({
      purchase_currency: 'ARS',
      purchase_date: '2010-01-01',
    }), RATES)

    expect(cost).toBeNull()
  })
})

describe('valuateHolding', () => {
  it('valúa en dólares y en pesos, y calcula el rendimiento', () => {
    const v = valuateHolding(holding(), 80000, 1500, RATES)

    expect(v.valueUsd).toBe(40000)
    expect(v.valueArs).toBe(60_000_000)
    expect(v.costUsd).toBe(30000)
    expect(v.returnUsd).toBe(10000)
    expect(v.returnPercent).toBeCloseTo(33.33, 2)
    expect(v.hasReturn).toBe(true)
  })

  it('una pérdida se reporta como pérdida', () => {
    const v = valuateHolding(holding(), 40000, 1500, RATES)

    expect(v.returnUsd).toBe(-10000)
    expect(v.returnPercent).toBeCloseTo(-33.33, 2)
  })

  it('sin costo convertible, valúa igual pero no muestra rendimiento', () => {
    // La tenencia sigue sumando al patrimonio: lo que no se puede afirmar es
    // cuánto rindió.
    const v = valuateHolding(
      holding({ purchase_currency: 'ARS', purchase_date: '2010-01-01' }),
      80000, 1500, RATES,
    )

    expect(v.valueUsd).toBe(40000)
    expect(v.hasReturn).toBe(false)
    expect(v.returnPercent).toBe(0)
  })
})

describe('resolvePriceUsd', () => {
  it('usa el precio de la fuente automática', () => {
    expect(resolvePriceUsd(holding(), new Map([['bitcoin', 80000]]))).toBe(80000)
  })

  it('si la fuente falló, cae al precio manual antes que a nada', () => {
    expect(resolvePriceUsd(holding({ manual_price: 75000 }), new Map())).toBe(75000)
  })

  it('sin fuente usa el precio manual', () => {
    const h = holding({ price_source: null, manual_price: 120, kind: 'accion' })

    expect(resolvePriceUsd(h, new Map())).toBe(120)
  })

  it('sin ninguno de los dos no hay precio', () => {
    expect(resolvePriceUsd(holding({ price_source: null }), new Map())).toBeNull()
  })
})

describe('portfolioTotals', () => {
  it('suma el valor de todas y el rendimiento solo de las comparables', () => {
    const conCosto = valuateHolding(holding(), 80000, 1500, RATES)
    const sinCosto = valuateHolding(
      holding({ id: 'h2', purchase_currency: 'ARS', purchase_date: '2010-01-01' }),
      80000, 1500, RATES,
    )

    const totals = portfolioTotals([conCosto, sinCosto])

    // Las dos suman al patrimonio...
    expect(totals.valueUsd).toBe(80000)
    // ...pero el rendimiento se calcula solo sobre la que tiene costo conocido.
    expect(totals.costUsd).toBe(30000)
    expect(totals.returnUsd).toBe(10000)
    expect(totals.returnPercent).toBeCloseTo(33.33, 2)
  })

  it('cuenta las que no se pudieron valuar en vez de saltearlas en silencio', () => {
    const totals = portfolioTotals([valuateHolding(holding(), 80000, 1500, RATES), null])

    expect(totals.unpriced).toBe(1)
    expect(totals.valueUsd).toBe(40000)
  })

  it('una cartera vacía no divide por cero', () => {
    expect(portfolioTotals([])).toEqual({
      valueUsd: 0, valueArs: 0, costUsd: 0, returnUsd: 0, returnPercent: 0, unpriced: 0,
    })
  })
})
