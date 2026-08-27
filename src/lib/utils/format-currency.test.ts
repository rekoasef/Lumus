import { describe, it, expect } from 'vitest'
import { formatCurrency } from './format-currency'

/**
 * Estos tests existen por el riesgo del refactor: unificar los nueve
 * formateadores sueltos no tenía que cambiar ni un decimal de lo que se ve en
 * pantalla. Cada caso es la salida que daba el `Intl.NumberFormat` que
 * reemplazó.
 *
 * El separador que mete ICU entre el símbolo y el número es un espacio duro,
 * no uno común — se normaliza para que el test diga lo que se lee en pantalla.
 */
const money = (...args: Parameters<typeof formatCurrency>) =>
  formatCurrency(...args).replace(/ /g, ' ')

describe('formatCurrency', () => {
  it('auto: muestra centavos solo cuando el monto los tiene', () => {
    expect(money(1234.56, 'ARS', 'auto')).toBe('$ 1.234,56')
    expect(money(1234, 'ARS', 'auto')).toBe('$ 1.234')
  })

  it('auto es el default, como en el formateador original', () => {
    expect(money(1234.56)).toBe(money(1234.56, 'ARS', 'auto'))
  })

  it('rounded: nunca muestra centavos', () => {
    expect(money(1234.56, 'ARS', 'rounded')).toBe('$ 1.235')
    expect(money(1234, 'ARS', 'rounded')).toBe('$ 1.234')
  })

  it('exact: siempre dos decimales, aunque el monto sea redondo', () => {
    expect(money(1234, 'ARS', 'exact')).toBe('$ 1.234,00')
    expect(money(1234.5, 'USD', 'exact')).toBe('US$ 1.234,50')
  })

  it('byCurrency: pesos sin centavos, moneda extranjera con centavos', () => {
    expect(money(1234.56, 'ARS', 'byCurrency')).toBe('$ 1.235')
    expect(money(1234.5, 'USD', 'byCurrency')).toBe('US$ 1.234,50')
  })

  it('compact: acorta los montos grandes', () => {
    expect(money(1250000, 'ARS', 'compact')).toBe('$1,3 M')
  })

  it('mantiene el signo de los montos negativos', () => {
    expect(money(-500, 'ARS', 'rounded')).toBe('-$ 500')
  })
})
