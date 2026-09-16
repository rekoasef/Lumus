import { describe, it, expect } from 'vitest'
import { firstChargeDate, isWithinPaidPeriod, resolveAccessKind, type AccessInput } from './access'

const NOW = new Date('2026-09-15T12:00:00Z')

const input = (overrides: Partial<AccessInput>): AccessInput => ({
  subscriptionStatus: null,
  paidUntil: null,
  hasGrant: false,
  grantExpiresAt: null,
  ...overrides,
})

describe('resolveAccessKind', () => {
  it('una suscripción autorizada entra, tenga o no grant', () => {
    expect(resolveAccessKind(input({ subscriptionStatus: 'authorized' }), NOW)).toBe('subscription')
    expect(resolveAccessKind(input({ subscriptionStatus: 'authorized', hasGrant: true, grantExpiresAt: '2020-01-01T00:00:00Z' }), NOW)).toBe('subscription')
  })

  it('un grant sin vencimiento entra', () => {
    expect(resolveAccessKind(input({ hasGrant: true }), NOW)).toBe('free_grant')
  })

  it('un grant vencido no entra', () => {
    expect(resolveAccessKind(input({ hasGrant: true, grantExpiresAt: '2026-09-14T12:00:00Z' }), NOW)).toBe('none')
  })

  it('sin fila de grant, un vencimiento nulo no se confunde con "para siempre"', () => {
    expect(resolveAccessKind(input({}), NOW)).toBe('none')
  })

  it('una suscripción pendiente o cancelada sin período pago no alcanza', () => {
    expect(resolveAccessKind(input({ subscriptionStatus: 'pending' }), NOW)).toBe('none')
    expect(resolveAccessKind(input({ subscriptionStatus: 'cancelled' }), NOW)).toBe('none')
  })

  it('cancelar no saca a nadie antes de que termine lo que pagó', () => {
    expect(resolveAccessKind(input({ subscriptionStatus: 'cancelled', paidUntil: '2026-10-01T00:00:00Z' }), NOW)).toBe('paid_period')
    expect(resolveAccessKind(input({ subscriptionStatus: 'paused', paidUntil: '2026-10-01T00:00:00Z' }), NOW)).toBe('paid_period')
  })

  it('un pago rechazado tiene días de gracia, y después se corta', () => {
    // Venció hace dos días: todavía dentro de la gracia.
    expect(resolveAccessKind(input({ subscriptionStatus: 'paused', paidUntil: '2026-09-13T12:00:00Z' }), NOW)).toBe('paid_period')
    // Venció hace cuatro: afuera.
    expect(resolveAccessKind(input({ subscriptionStatus: 'paused', paidUntil: '2026-09-11T12:00:00Z' }), NOW)).toBe('none')
  })

  it('volver a suscribirse no corta los días que ya pagó', () => {
    // Arrancar el checkout pasa la fila a `pending`; el período pago sigue.
    expect(resolveAccessKind(input({ subscriptionStatus: 'pending', paidUntil: '2026-10-01T00:00:00Z' }), NOW)).toBe('paid_period')
  })

  it('terminado el período pago, una prueba vigente sigue valiendo', () => {
    expect(resolveAccessKind(input({ subscriptionStatus: 'cancelled', paidUntil: '2026-01-01T00:00:00Z', hasGrant: true, grantExpiresAt: '2026-10-01T00:00:00Z' }), NOW)).toBe('free_grant')
  })
})

describe('isWithinPaidPeriod', () => {
  it('sin fecha no hay período', () => {
    expect(isWithinPaidPeriod(null, NOW)).toBe(false)
  })
})

describe('firstChargeDate', () => {
  it('sin nada por delante, se cobra en el momento', () => {
    expect(firstChargeDate({ grantExpiresAt: null, paidUntil: null }, NOW)).toBeNull()
    expect(firstChargeDate({ grantExpiresAt: '2026-09-01T00:00:00Z', paidUntil: '2026-08-01T00:00:00Z' }, NOW)).toBeNull()
  })

  it('durante la prueba, el primer cobro es el día que termina', () => {
    expect(firstChargeDate({ grantExpiresAt: '2026-09-24T15:00:00Z', paidUntil: null }, NOW)).toBe('2026-09-24T15:00:00.000Z')
  })

  it('si tiene prueba y período pago, espera al que termina después', () => {
    expect(firstChargeDate({ grantExpiresAt: '2026-09-20T00:00:00Z', paidUntil: '2026-10-05T00:00:00Z' }, NOW)).toBe('2026-10-05T00:00:00.000Z')
  })
})
