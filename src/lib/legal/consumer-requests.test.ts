import { describe, expect, it } from 'vitest'
import {
  businessDaysBetween,
  generateConfirmToken,
  generateRequestCode,
  hashConfirmToken,
  isExpired,
  isRateLimited,
  normalizeEmail,
} from './consumer-requests'

describe('generateRequestCode', () => {
  it('lleva el prefijo del tipo y el formato XXXX-XXXX', () => {
    expect(generateRequestCode('arrepentimiento')).toMatch(/^ARR-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(generateRequestCode('baja')).toMatch(/^BAJ-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  })

  // Se dicta o se copia a mano: nada que se confunda.
  it('no usa caracteres ambiguos', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateRequestCode('baja').slice(4)).not.toMatch(/[01OIL]/)
    }
  })

  it('usa el generador que se le pase', () => {
    expect(generateRequestCode('baja', () => 0)).toBe('BAJ-2222-2222')
  })
})

describe('token de confirmación', () => {
  it('es distinto cada vez', () => {
    expect(generateConfirmToken()).not.toBe(generateConfirmToken())
  })

  // Lo que se guarda no es el token: quien lea la tabla no puede confirmar nada.
  it('el hash es estable y no es el token', () => {
    const token = generateConfirmToken()
    expect(hashConfirmToken(token)).toBe(hashConfirmToken(token))
    expect(hashConfirmToken(token)).not.toContain(token)
  })
})

describe('isRateLimited', () => {
  it('frena a partir de la tercera solicitud en una hora', () => {
    expect(isRateLimited(2)).toBe(false)
    expect(isRateLimited(3)).toBe(true)
  })
})

describe('normalizeEmail', () => {
  it('saca espacios y mayúsculas', () => {
    expect(normalizeEmail('  Renzo@Mail.COM ')).toBe('renzo@mail.com')
  })
})

describe('businessDaysBetween', () => {
  it('no cuenta el fin de semana', () => {
    // viernes 18/09/2026 → lunes 21/09/2026
    expect(businessDaysBetween(new Date('2026-09-18T15:00:00Z'), new Date('2026-09-21T10:00:00Z'))).toBe(1)
  })

  it('dos semanas corridas son diez hábiles', () => {
    expect(businessDaysBetween(new Date('2026-09-14T12:00:00Z'), new Date('2026-09-28T12:00:00Z'))).toBe(10)
  })

  it('el mismo día, o hacia atrás, es cero', () => {
    const d = new Date('2026-09-17T12:00:00Z')
    expect(businessDaysBetween(d, d)).toBe(0)
    expect(businessDaysBetween(d, new Date('2026-09-10T12:00:00Z'))).toBe(0)
  })
})

describe('isExpired', () => {
  const now = new Date('2026-09-17T12:00:00Z')
  it('sin vencimiento cuenta como vencido', () => {
    expect(isExpired(null, now)).toBe(true)
  })
  it('compara contra ahora', () => {
    expect(isExpired('2026-09-17T11:59:59Z', now)).toBe(true)
    expect(isExpired('2026-09-17T12:00:01Z', now)).toBe(false)
  })
})
