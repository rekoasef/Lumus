import { describe, it, expect } from 'vitest'
import { priceHistoryRows } from './price-snapshot'
import { EMPTY_QUOTES, type PriceQuotes } from './holdings'

const quotes: PriceQuotes = {
  ...EMPTY_QUOTES,
  cripto: { bitcoin: { priceUsd: 60_000, changePercent: 1 } },
  accion: { GGAL: { priceArs: 6_000, changePercent: 0 } },
}

describe('priceHistoryRows', () => {
  it('guarda una fila por especie, aunque la tengan varias personas', () => {
    const rows = priceHistoryRows(
      [
        { kind: 'accion', price_source: 'GGAL' },
        { kind: 'accion', price_source: 'GGAL' },
        { kind: 'cripto', price_source: 'bitcoin' },
      ],
      quotes,
      '2026-09-15',
    )
    expect(rows).toEqual([
      { kind: 'accion', symbol: 'GGAL', date: '2026-09-15', price: 6_000, currency: 'ARS' },
      { kind: 'cripto', symbol: 'bitcoin', date: '2026-09-15', price: 60_000, currency: 'USD' },
    ])
  })

  it('no guarda lo que no tiene precio ni lo que es manual', () => {
    const rows = priceHistoryRows(
      [
        { kind: 'cedear', price_source: 'AAPL' },
        { kind: 'otro', price_source: null },
      ],
      quotes,
      '2026-09-15',
    )
    expect(rows).toEqual([])
  })
})
