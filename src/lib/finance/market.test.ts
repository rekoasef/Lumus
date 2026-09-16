import { describe, it, expect } from 'vitest'
import { pesoTickers, type ArsQuote } from './market'

const q = (priceArs: number): ArsQuote => ({ priceArs, changePercent: 0 })

describe('pesoTickers', () => {
  it('saca las variantes en dólares de un CEDEAR', () => {
    expect(pesoTickers({ AAPL: q(15_000), AAPLD: q(11.2), AAPLC: q(11.1) })).toEqual(['AAPL'])
  })

  it('deja un ticker que termina en D o C si es otra especie en pesos', () => {
    // Datos reales de data912: BBD (Bradesco) y BB (Banco do Brasil) cotizan los dos en pesos.
    expect(pesoTickers({ BB: q(4_155), BBD: q(5_595) })).toEqual(['BB', 'BBD'])
  })

  it('deja un ticker con sufijo que no tiene de quién ser variante', () => {
    expect(pesoTickers({ YPFD: q(50_000) })).toEqual(['YPFD'])
  })
})
