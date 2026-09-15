import { describe, it, expect } from 'vitest'
import { daysUntil, extendedExpiry } from './grants'

const NOW = new Date('2026-09-15T12:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

describe('extendedExpiry', () => {
  it('a un acceso vigente le suma desde su vencimiento, sin robarle los días que le quedan', () => {
    const inTenDays = new Date(NOW.getTime() + 10 * DAY_MS).toISOString()
    expect(daysUntil(extendedExpiry(inTenDays, 30, NOW), NOW)).toBe(40)
  })

  it('a un acceso vencido le suma desde hoy, para que no quede vencido igual', () => {
    const twoMonthsAgo = new Date(NOW.getTime() - 60 * DAY_MS).toISOString()
    expect(daysUntil(extendedExpiry(twoMonthsAgo, 30, NOW), NOW)).toBe(30)
  })
})

describe('daysUntil', () => {
  it('redondea para arriba y da negativo si ya venció', () => {
    expect(daysUntil(new Date(NOW.getTime() + 1.2 * DAY_MS).toISOString(), NOW)).toBe(2)
    expect(daysUntil(new Date(NOW.getTime() - 3 * DAY_MS).toISOString(), NOW)).toBe(-3)
  })
})
