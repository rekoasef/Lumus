import { describe, it, expect } from 'vitest'
import { resolveAccessKind } from './access'

const NOW = new Date('2026-09-15T12:00:00Z')

describe('resolveAccessKind', () => {
  it('una suscripción autorizada entra, tenga o no grant', () => {
    expect(resolveAccessKind('authorized', false, null, NOW)).toBe('subscription')
    expect(resolveAccessKind('authorized', true, '2020-01-01T00:00:00Z', NOW)).toBe('subscription')
  })

  it('un grant sin vencimiento entra', () => {
    expect(resolveAccessKind(null, true, null, NOW)).toBe('free_grant')
  })

  it('un grant vencido no entra', () => {
    expect(resolveAccessKind(null, true, '2026-09-14T12:00:00Z', NOW)).toBe('none')
  })

  it('sin fila de grant, un vencimiento nulo no se confunde con "para siempre"', () => {
    expect(resolveAccessKind(null, false, null, NOW)).toBe('none')
  })

  it('una suscripción pendiente o cancelada no alcanza', () => {
    expect(resolveAccessKind('pending', false, null, NOW)).toBe('none')
    expect(resolveAccessKind('cancelled', false, null, NOW)).toBe('none')
  })
})
