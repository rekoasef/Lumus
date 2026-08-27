import { describe, it, expect } from 'vitest'
import { frequentDefaults } from './frequent-defaults'

describe('frequentDefaults', () => {
  it('elige la categoría y la billetera más repetidas', () => {
    const defaults = frequentDefaults([
      { category_id: 'super', wallet_id: 'debito' },
      { category_id: 'super', wallet_id: 'efectivo' },
      { category_id: 'nafta', wallet_id: 'debito' },
      { category_id: 'super', wallet_id: 'debito' },
    ])

    expect(defaults).toEqual({ category_id: 'super', wallet_id: 'debito' })
  })

  it('las cuenta por separado: la más usada de cada una, no la combinación', () => {
    const defaults = frequentDefaults([
      { category_id: 'super', wallet_id: 'efectivo' },
      { category_id: 'super', wallet_id: 'efectivo' },
      { category_id: 'nafta', wallet_id: 'debito' },
      { category_id: 'nafta', wallet_id: 'debito' },
      { category_id: 'nafta', wallet_id: 'efectivo' },
    ])

    expect(defaults.category_id).toBe('nafta')
    expect(defaults.wallet_id).toBe('efectivo')
  })

  it('ignora los movimientos sin categoría en vez de elegir "ninguna"', () => {
    // Sin esto, un usuario que carga la mitad de sus gastos sin categoría se
    // encontraría el formulario preseleccionando "sin categoría".
    const defaults = frequentDefaults([
      { category_id: null, wallet_id: 'debito' },
      { category_id: null, wallet_id: 'debito' },
      { category_id: 'super', wallet_id: 'debito' },
    ])

    expect(defaults.category_id).toBe('super')
  })

  it('sin movimientos no inventa nada', () => {
    expect(frequentDefaults([])).toEqual({ category_id: null, wallet_id: null })
  })

  it('en empate gana el más reciente, que es el primero de la lista', () => {
    const defaults = frequentDefaults([
      { category_id: 'reciente', wallet_id: null },
      { category_id: 'vieja', wallet_id: null },
    ])

    expect(defaults.category_id).toBe('reciente')
  })
})
