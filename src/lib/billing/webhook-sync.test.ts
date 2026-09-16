import { describe, expect, it } from 'vitest'
import { subscriptionUpdateFromMp } from './webhook-sync'

const NOW = new Date('2026-10-01T12:00:00Z')

describe('subscriptionUpdateFromMp', () => {
  it('con la suscripción autorizada, el pagado-hasta avanza al próximo cobro', () => {
    const update = subscriptionUpdateFromMp(
      { id: 'mp1', status: 'authorized', next_payment_date: '2026-10-24T13:00:00.000-03:00' },
      NOW,
    )
    expect(update).toMatchObject({ status: 'authorized', paid_until: '2026-10-24T16:00:00.000Z' })
  })

  it('cancelar no borra el pagado-hasta: la clave ni aparece', () => {
    const update = subscriptionUpdateFromMp({ id: 'mp1', status: 'cancelled', next_payment_date: null }, NOW)
    expect(update.status).toBe('cancelled')
    expect('paid_until' in update).toBe(false)
  })

  it('una pausa tampoco lo toca, aunque MP informe una fecha', () => {
    const update = subscriptionUpdateFromMp(
      { id: 'mp1', status: 'paused', next_payment_date: '2026-11-24T13:00:00.000-03:00' },
      NOW,
    )
    expect('paid_until' in update).toBe(false)
  })

  it('el mismo aviso dos veces escribe lo mismo', () => {
    const preapproval = { id: 'mp1', status: 'authorized', next_payment_date: '2026-10-24T13:00:00.000-03:00' }
    expect(subscriptionUpdateFromMp(preapproval, NOW)).toEqual(subscriptionUpdateFromMp(preapproval, NOW))
  })
})
