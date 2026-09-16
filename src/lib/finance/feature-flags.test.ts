import { describe, expect, it } from 'vitest'
import { PORTFOLIO_WALLETS_ENABLED, isPortfolioWallet } from './feature-flags'

describe('isPortfolioWallet', () => {
  it('una billetera que no es de inversión nunca es cartera', () => {
    expect(isPortfolioWallet({ type: 'banco', investment_mode: 'tenencias' })).toBe(false)
    expect(isPortfolioWallet({ type: 'efectivo', investment_mode: null })).toBe(false)
  })

  it('una inversión con saldo no es cartera', () => {
    expect(isPortfolioWallet({ type: 'inversion', investment_mode: 'saldo' })).toBe(false)
    expect(isPortfolioWallet({ type: 'inversion', investment_mode: null })).toBe(false)
  })

  // Se afirma contra el flag y no contra `true`/`false`: el día que la feature
  // se prenda, este test tiene que seguir pasando sin tocarlo.
  it('una inversión con tenencias es cartera solo si la feature está prendida', () => {
    expect(isPortfolioWallet({ type: 'inversion', investment_mode: 'tenencias' })).toBe(PORTFOLIO_WALLETS_ENABLED)
  })
})
