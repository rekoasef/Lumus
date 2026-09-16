import { describe, it, expect } from 'vitest'
import {
  averagePrice,
  portfolioTotals,
  portfolioWalletSummary,
  positionFromTrades,
  resolveHoldingPrice,
  valueHoldings,
  valuatePosition,
  EMPTY_QUOTES,
  type Holding,
  type HoldingTrade,
  type PriceQuotes,
} from './holdings'
import type { DailyRate } from './purchasing-power'

const RATES: DailyRate[] = [
  { date: '2024-06-03', usd: 1000 },
  { date: '2026-01-10', usd: 1400 },
  { date: '2026-08-27', usd: 1500 },
]

let seq = 0
function trade(overrides: Partial<HoldingTrade> = {}): HoldingTrade {
  seq++
  return {
    id: `t${seq}`,
    holding_id: 'h1',
    side: 'compra',
    quantity: 10,
    price: 1000,
    currency: 'ARS',
    trade_date: '2026-01-10',
    created_at: `2026-01-10T00:00:${String(seq).padStart(2, '0')}Z`,
    ...overrides,
  }
}

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: 'h1',
    wallet_id: 'w1',
    name: 'GGAL',
    kind: 'accion',
    price_source: 'GGAL',
    manual_price: null,
    ...overrides,
  }
}

describe('positionFromTrades', () => {
  it('varias compras se suman, con el costo en dólares de cada día', () => {
    const p = positionFromTrades([
      trade({ quantity: 10, price: 1000, trade_date: '2024-06-03' }), // 10.000 ARS @1000 = 10 USD
      trade({ quantity: 10, price: 2800, trade_date: '2026-01-10' }), // 28.000 ARS @1400 = 20 USD
    ], RATES)

    expect(p.quantity).toBe(20)
    expect(p.costArs).toBe(38_000)
    expect(p.costUsd).toBe(30)
  })

  it('el precio promedio sale en la moneda en la que cotiza la especie', () => {
    const p = positionFromTrades([
      trade({ quantity: 10, price: 1000 }),
      trade({ quantity: 30, price: 2000 }),
    ], RATES)
    expect(averagePrice(p, 'accion')).toBe(1750)
  })

  it('vender la mitad se lleva la mitad del costo y deja la ganancia realizada', () => {
    const p = positionFromTrades([
      trade({ quantity: 10, price: 1400, trade_date: '2026-01-10' }), // costo 10 USD
      trade({ side: 'venta', quantity: 5, price: 3000, trade_date: '2026-08-27' }), // cobra 15.000 ARS @1500 = 10 USD
    ], RATES)

    expect(p.quantity).toBe(5)
    expect(p.costUsd).toBe(5)
    // Se vendió lo que costó 5 USD en 10 USD.
    expect(p.realizedUsd).toBe(5)
  })

  it('una venta por más de lo que hay no deja la cantidad negativa', () => {
    const p = positionFromTrades([
      trade({ quantity: 10 }),
      trade({ side: 'venta', quantity: 50, trade_date: '2026-08-27' }),
    ], RATES)
    expect(p.quantity).toBe(0)
    expect(p.costUsd).toBe(0)
  })

  it('el orden es por fecha, no por cómo llegaron', () => {
    const venta = trade({ side: 'venta', quantity: 5, trade_date: '2026-08-27' })
    const compra = trade({ quantity: 10, trade_date: '2026-01-10' })
    expect(positionFromTrades([venta, compra], RATES).quantity).toBe(5)
  })

  it('una compra en pesos sin cotización de su día no inventa un costo en dólares', () => {
    const p = positionFromTrades([trade({ trade_date: '2020-01-01' })], RATES)
    expect(p.quantity).toBe(10)
    expect(p.costUsd).toBeNull()
    expect(p.costArs).toBe(10_000)
  })
})

describe('resolveHoldingPrice', () => {
  const quotes: PriceQuotes = {
    cripto: { bitcoin: { priceUsd: 60_000, changePercent: 1.5 } },
    accion: { GGAL: { priceArs: 6_000, changePercent: -2 } },
    cedear: { AAPL: { priceArs: 15_000, changePercent: 0.4 } },
  }

  it('una acción cotiza en pesos y se lleva a dólares con el dólar de hoy', () => {
    expect(resolveHoldingPrice(holding(), quotes, 1500)).toEqual({
      priceUsd: 4, priceArs: 6_000, changePercent: -2, automatic: true,
    })
  })

  it('un CEDEAR busca en su propia lista, aunque el ticker exista también como acción', () => {
    const price = resolveHoldingPrice(holding({ kind: 'cedear', price_source: 'AAPL' }), quotes, 1500)
    expect(price?.priceArs).toBe(15_000)
    expect(resolveHoldingPrice(holding({ kind: 'cedear', price_source: 'GGAL' }), quotes, 1500)).toBeNull()
  })

  it('una cripto cotiza en dólares', () => {
    const price = resolveHoldingPrice(holding({ kind: 'cripto', price_source: 'bitcoin' }), quotes, 1500)
    expect(price?.priceArs).toBe(90_000_000)
  })

  it('si la fuente no la trae, usa el precio manual; sin ninguno, no inventa', () => {
    const conManual = holding({ price_source: 'XXXX', manual_price: 3 })
    expect(resolveHoldingPrice(conManual, quotes, 1500)).toEqual({
      priceUsd: 3, priceArs: 4_500, changePercent: null, automatic: false,
    })
    expect(resolveHoldingPrice(holding({ price_source: 'XXXX' }), quotes, 1500)).toBeNull()
  })

  it('sin cotización del dólar no hay precio', () => {
    expect(resolveHoldingPrice(holding(), quotes, 0)).toBeNull()
  })
})

describe('valuatePosition y portfolioTotals', () => {
  it('rinde en dólares contra lo que se pagó en dólares, y en pesos contra los pesos', () => {
    const position = positionFromTrades([trade({ quantity: 10, price: 1400, trade_date: '2026-01-10' })], RATES)
    // Hoy vale 3.000 ARS con el dólar a 1.500: 30.000 ARS = 20 USD. Costó 14.000 ARS = 10 USD.
    const v = valuatePosition(position, { priceUsd: 2, priceArs: 3_000, changePercent: null, automatic: true })

    expect(v.valueArs).toBe(30_000)
    expect(v.returnUsd).toBe(10)
    expect(v.returnPercent).toBe(100)
    expect(v.returnArs).toBe(16_000)
  })

  it('el total solo mide rendimiento sobre lo que tiene costo conocido, y cuenta lo que no tiene precio', () => {
    const conCosto = valuatePosition(
      positionFromTrades([trade({ quantity: 10, price: 1400 })], RATES),
      { priceUsd: 2, priceArs: 3_000, changePercent: null, automatic: true },
    )
    const sinCosto = valuatePosition(
      positionFromTrades([trade({ trade_date: '2020-01-01' })], RATES),
      { priceUsd: 2, priceArs: 3_000, changePercent: null, automatic: true },
    )

    const totals = portfolioTotals([conCosto, sinCosto, null])
    expect(totals.valueUsd).toBe(40)
    expect(totals.returnPercent).toBe(100)
    expect(totals.unpriced).toBe(1)
  })
})

describe('valueHoldings', () => {
  it('arma cada especie con sus operaciones y deja afuera lo que ya se vendió entero', () => {
    const quotes: PriceQuotes = { ...EMPTY_QUOTES, accion: { GGAL: { priceArs: 3_000, changePercent: null }, YPFD: { priceArs: 50_000, changePercent: null } } }
    const valued = valueHoldings(
      [holding(), holding({ id: 'h2', name: 'YPFD', price_source: 'YPFD' })],
      [
        trade({ holding_id: 'h1', quantity: 10 }),
        trade({ holding_id: 'h2', quantity: 2 }),
        trade({ holding_id: 'h2', side: 'venta', quantity: 2, trade_date: '2026-08-27' }),
      ],
      quotes,
      1500,
      RATES,
    )

    expect(valued.map(v => v.holding.id)).toEqual(['h1'])
    expect(valued[0].valuation?.valueArs).toBe(30_000)
  })
})

describe('portfolioWalletSummary', () => {
  it('suma el efectivo y las especies una sola vez', () => {
    const quotes: PriceQuotes = { ...EMPTY_QUOTES, accion: { GGAL: { priceArs: 3_000, changePercent: null } } }
    const valued = valueHoldings([holding()], [trade({ quantity: 10 })], quotes, 1500, RATES)
    const summary = portfolioWalletSummary(valued, 5_000)
    expect(summary.valueArs).toBe(30_000)
    expect(summary.totalArs).toBe(35_000)
  })
})
