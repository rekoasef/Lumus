import { describe, expect, it } from 'vitest'
import { CHECKOUT_WAIT_MINUTES, isAwaitingPayment } from './checkout'

const NOW = new Date('2026-09-17T21:00:00Z')
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60 * 1000).toISOString()

describe('isAwaitingPayment', () => {
  it('espera mientras el checkout es reciente', () => {
    expect(isAwaitingPayment({ status: 'pending', startedAt: minutesAgo(0), now: NOW })).toBe(true)
    expect(isAwaitingPayment({ status: 'pending', startedAt: minutesAgo(5), now: NOW })).toBe(true)
  })

  // El bug: quien abrió el checkout y no pagó veía "esperando la confirmación
  // del pago" para siempre, en cada visita a /suscripcion.
  it('deja de esperar un checkout abandonado', () => {
    expect(isAwaitingPayment({
      status: 'pending',
      startedAt: minutesAgo(CHECKOUT_WAIT_MINUTES + 1),
      now: NOW,
    })).toBe(false)
    expect(isAwaitingPayment({ status: 'pending', startedAt: minutesAgo(60 * 24), now: NOW })).toBe(false)
  })

  it('no espera nada si la suscripción no está pendiente', () => {
    for (const status of ['authorized', 'cancelled', 'paused', null]) {
      expect(isAwaitingPayment({ status, startedAt: minutesAgo(1), now: NOW })).toBe(false)
    }
  })

  it('no espera sin fecha de arranque ni con una fecha inválida', () => {
    expect(isAwaitingPayment({ status: 'pending', startedAt: null, now: NOW })).toBe(false)
    expect(isAwaitingPayment({ status: 'pending', startedAt: 'cualquier cosa', now: NOW })).toBe(false)
  })

  it('no espera por una fecha futura (reloj corrido)', () => {
    const futuro = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString()
    expect(isAwaitingPayment({ status: 'pending', startedAt: futuro, now: NOW })).toBe(false)
  })
})
