import { describe, expect, it } from 'vitest'
import { WALLET_PRESETS, parseAmountInput } from './wallet-presets'

describe('parseAmountInput', () => {
  it('lee pesos con punto de miles', () => {
    expect(parseAmountInput('150.000')).toBe(150000)
    expect(parseAmountInput('1.250.000')).toBe(1250000)
  })

  it('lee la coma como decimal', () => {
    expect(parseAmountInput('1.500,50')).toBe(1500.5)
    expect(parseAmountInput('99,9')).toBe(99.9)
  })

  // El teclado numérico de algunos celulares solo tiene punto.
  it('un punto con uno o dos decimales es decimal', () => {
    expect(parseAmountInput('12.5')).toBe(12.5)
    expect(parseAmountInput('12.50')).toBe(12.5)
  })

  it('acepta números sin separadores y con espacios', () => {
    expect(parseAmountInput(' 45000 ')).toBe(45000)
    expect(parseAmountInput('45 000')).toBe(45000)
  })

  it('vacío o inválido da null', () => {
    expect(parseAmountInput('')).toBeNull()
    expect(parseAmountInput('abc')).toBeNull()
    expect(parseAmountInput('-50')).toBeNull()
    expect(parseAmountInput('1,2,3')).toBeNull()
  })
})

describe('WALLET_PRESETS', () => {
  // Lo que valida `createWalletSchema`: un preset que no pase no se puede crear.
  it('cada preset tiene color hex y moneda de tres letras', () => {
    for (const p of WALLET_PRESETS) {
      expect(p.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.currency).toHaveLength(3)
    }
  })

  it('los ids no se repiten', () => {
    expect(new Set(WALLET_PRESETS.map(p => p.id)).size).toBe(WALLET_PRESETS.length)
  })
})
