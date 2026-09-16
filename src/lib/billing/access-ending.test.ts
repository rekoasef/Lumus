import { describe, expect, it } from 'vitest'
import { accessBannerState, accessDaysLeft, accessEndingPhrase } from './access-ending'

// 8 AM en Argentina (UTC-3), la hora a la que corre el cron.
const NOW = new Date('2026-09-16T11:00:00Z')

describe('accessDaysLeft', () => {
  it('cuenta días de calendario en Argentina, no horas', () => {
    // 23:30 de hoy en Argentina: faltan horas, pero es hoy.
    expect(accessDaysLeft('2026-09-17T02:30:00Z', NOW)).toBe(0)
    // 00:30 de mañana en Argentina.
    expect(accessDaysLeft('2026-09-17T03:30:00Z', NOW)).toBe(1)
  })

  it('da negativo cuando ya venció', () => {
    expect(accessDaysLeft('2026-09-14T15:00:00Z', NOW)).toBe(-2)
  })

  it('cruza meses', () => {
    expect(accessDaysLeft('2026-10-16T15:00:00Z', NOW)).toBe(30)
  })
})

describe('accessEndingPhrase', () => {
  it('no dice "en 0 días" ni "en 1 días"', () => {
    expect(accessEndingPhrase(0)).toBe('termina hoy')
    expect(accessEndingPhrase(1)).toBe('termina mañana')
    expect(accessEndingPhrase(5)).toBe('termina en 5 días')
    expect(accessEndingPhrase(-1)).toBe('terminó')
  })
})

describe('accessBannerState', () => {
  const grant = (expiresAt: string | null) => ({ kind: 'free_grant' as const, grantExpiresAt: expiresAt, paidUntil: null })

  it('no se muestra sin acceso gratis con fecha', () => {
    expect(accessBannerState({ kind: 'subscription', grantExpiresAt: null, paidUntil: null }, NOW)).toBeNull()
    expect(accessBannerState(grant(null), NOW)).toBeNull()
  })

  it('es discreto con más de una semana y urgente en la última', () => {
    expect(accessBannerState(grant('2026-10-01T15:00:00Z'), NOW)).toMatchObject({ daysLeft: 15, urgent: false })
    expect(accessBannerState(grant('2026-09-23T15:00:00Z'), NOW)).toMatchObject({ daysLeft: 7, urgent: true })
    expect(accessBannerState(grant('2026-09-16T20:00:00Z'), NOW)).toMatchObject({ daysLeft: 0, urgent: true })
  })

  it('con una suscripción que no se renueva, avisa siempre y en la versión visible', () => {
    const paid = (paidUntil: string) => ({ kind: 'paid_period' as const, grantExpiresAt: null, paidUntil })
    // La fecha que se muestra incluye los 3 días de gracia.
    expect(accessBannerState(paid('2026-10-10T15:00:00Z'), NOW)).toMatchObject({ reason: 'paid', daysLeft: 27, urgent: true, endsOn: '13 de octubre' })
    // Pagado hasta ayer: en la gracia, el corte real es en dos días, no "ayer".
    expect(accessBannerState(paid('2026-09-15T15:00:00Z'), NOW)).toMatchObject({ reason: 'paid', daysLeft: 2, endsOn: '18 de septiembre' })
  })

  it('muestra la fecha en castellano', () => {
    expect(accessBannerState(grant('2026-10-01T15:00:00Z'), NOW)?.endsOn).toBe('1 de octubre')
  })
})
