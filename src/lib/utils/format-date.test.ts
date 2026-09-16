import { describe, expect, it } from 'vitest'
import { formatDate, localDateStr, timeAgo } from './format-date'

describe('localDateStr', () => {
  it('usa los componentes locales de la fecha', () => {
    // Construido con hora local, así que el resultado no depende de la zona
    // donde corran los tests.
    expect(localDateStr(new Date(2026, 8, 16, 14, 30))).toBe('2026-09-16')
  })

  it('rellena mes y día con cero', () => {
    expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  /*
   * La razón de existir de la función: al oeste de UTC, entre medianoche y las
   * X:00, `toISOString()` ya está en el día siguiente. Cargar un gasto a las
   * 22:00 en Argentina lo guardaría con la fecha de mañana.
   *
   * Solo corre donde la diferencia es observable (offset > 0 = al oeste de UTC),
   * para no romper en un CI que corra en UTC.
   */
  it.runIf(new Date().getTimezoneOffset() > 0)('no se adelanta un día de noche, como sí haría toISOString', () => {
    const lateNight = new Date(2026, 8, 16, 23, 30)

    expect(localDateStr(lateNight)).toBe('2026-09-16')
    expect(lateNight.toISOString().slice(0, 10)).toBe('2026-09-17')
  })
})

describe('timeAgo', () => {
  const now = new Date('2026-09-16T12:00:00Z')
  const agoMinutes = (n: number) => new Date(now.getTime() - n * 60000).toISOString()

  it('lo de hace menos de un minuto es "recién"', () => {
    expect(timeAgo(agoMinutes(0), now)).toBe('recién')
    expect(timeAgo(agoMinutes(0.5), now)).toBe('recién')
  })

  it('cuenta minutos hasta la hora', () => {
    expect(timeAgo(agoMinutes(1), now)).toBe('hace 1 min')
    expect(timeAgo(agoMinutes(59), now)).toBe('hace 59 min')
  })

  it('cuenta horas hasta el día', () => {
    expect(timeAgo(agoMinutes(60), now)).toBe('hace 1 h')
    expect(timeAgo(agoMinutes(60 * 23), now)).toBe('hace 23 h')
  })

  it('un día es "ayer" y no "hace 1 días"', () => {
    expect(timeAgo(agoMinutes(60 * 24), now)).toBe('ayer')
  })

  it('cuenta días hasta la semana', () => {
    expect(timeAgo(agoMinutes(60 * 24 * 2), now)).toBe('hace 2 días')
    expect(timeAgo(agoMinutes(60 * 24 * 6), now)).toBe('hace 6 días')
  })

  it('cuenta semanas hasta el mes largo', () => {
    expect(timeAgo(agoMinutes(60 * 24 * 7), now)).toBe('hace 1 sem')
    expect(timeAgo(agoMinutes(60 * 24 * 27), now)).toBe('hace 3 sem')
  })

  // Más allá de un mes "hace 9 sem" ya no ubica a nadie: pasa a fecha.
  it('lo viejo se muestra con fecha', () => {
    const old = timeAgo(agoMinutes(60 * 24 * 60), now)
    expect(old).not.toMatch(/hace|recién|ayer/)
    expect(old).toMatch(/jul/i)
  })

  // Un aviso con fecha apenas futura (relojes que no coinciden) no puede quedar
  // como "hace -3 min".
  it('una fecha futura no muestra un número negativo', () => {
    expect(timeAgo(new Date(now.getTime() + 120000).toISOString(), now)).toBe('recién')
  })
})

describe('formatDate', () => {
  it('escribe la fecha en castellano', () => {
    expect(formatDate('2026-09-16T12:00:00Z')).toMatch(/16 de septiembre de 2026/i)
  })

  it('acepta un Date además de un string', () => {
    expect(formatDate(new Date(2026, 8, 16))).toMatch(/16 de septiembre de 2026/i)
  })

  it('las opciones pisan el formato por defecto', () => {
    // Con el mes corto, es-AR escribe "16 sept" — sin el "de" del formato largo.
    expect(formatDate('2026-09-16T12:00:00Z', { day: 'numeric', month: 'short', year: undefined }))
      .toMatch(/16 sept/i)
  })
})
