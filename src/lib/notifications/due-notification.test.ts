import { describe, it, expect } from 'vitest'
import { dueTiming, todayInArgentina, buildDueNotification } from './due-notification'
import type { DueNotice } from './due-recurring'

describe('dueTiming', () => {
  it('dice en castellano cuánto falta', () => {
    expect(dueTiming(3)).toBe('Vence en 3 días')
    expect(dueTiming(1)).toBe('Vence mañana')
    expect(dueTiming(0)).toBe('Vence hoy')
  })

  it('nunca dice "en -1 días"', () => {
    expect(dueTiming(-1)).toBe('Venció ayer')
    expect(dueTiming(-5)).toBe('Venció hace 5 días')
  })
})

describe('todayInArgentina', () => {
  it('usa el día del usuario, no el del servidor en UTC', () => {
    // 2:30 UTC del 28 son las 23:30 del 27 en Buenos Aires. El cron corre en
    // UTC: sin esto avisaría con un día de desfasaje.
    expect(todayInArgentina(new Date('2026-08-28T02:30:00Z'))).toBe('2026-08-27')
    expect(todayInArgentina(new Date('2026-08-28T13:00:00Z'))).toBe('2026-08-28')
  })
})

describe('buildDueNotification', () => {
  const notice: DueNotice = {
    recurring: {
      id: 'rec-1',
      user_id: 'user-1',
      description: 'Seguro de la moto',
      amount: 45000,
      type: 'gasto',
      repeat_type: 'monthly',
      next_date: '2026-08-29',
      active: true,
    },
    phase: 'proximo',
    daysUntil: 2,
    dedupeKey: 'venc:rec-1:2026-08-29:proximo',
  }

  it('arma el aviso con el nombre, el plazo y el monto', () => {
    const notification = buildDueNotification(notice)

    expect(notification.title).toBe('Seguro de la moto')
    expect(notification.body).toContain('Vence en 2 días')
    expect(notification.body).toContain('45.000')
    expect(notification.type).toBe('vencimiento')
    expect(notification.dedupeKey).toBe(notice.dedupeKey)
  })

  it('un recurrente sin descripción no genera un aviso sin título', () => {
    const sinNombre = buildDueNotification({
      ...notice,
      recurring: { ...notice.recurring, description: '   ' },
    })

    expect(sinNombre.title).toBe('Gasto fijo')
  })
})
