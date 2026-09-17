import { describe, expect, it } from 'vitest'
import { spendInARS, spentByKey, type SpendRow } from './budget-spend'
import type { DailyRate } from './purchasing-power'

const history: DailyRate[] = [
  { date: '2026-09-01', usd: 1400 },
  { date: '2026-09-05', usd: 1500 },
]

/** El dólar de hoy, distinto a todos los de la historia para ver cuál se usó. */
const todayToARS = (amount: number, currency: string) =>
  currency === 'USD' ? amount * 2000 : currency === 'EUR' ? amount * 2200 : amount

function row(partial: Partial<SpendRow> = {}): SpendRow {
  return { category_id: 'ocio', amount: 0, date: '2026-09-05', currency: 'ARS', ...partial }
}

describe('spendInARS', () => {
  it('deja los pesos como están', () => {
    expect(spendInARS(row({ amount: 18700 }), history, todayToARS)).toBe(18700)
  })

  // El caso que abrió el arreglo: US$ 120 contaban como $ 120.
  it('convierte un gasto en dólares con el blue del día del gasto', () => {
    expect(spendInARS(row({ amount: 120, currency: 'USD', date: '2026-09-05' }), history, todayToARS)).toBe(180000)
  })

  // Un domingo no cotiza: vale el último dato anterior, nunca uno posterior.
  it('en un día sin cotización usa la anterior', () => {
    expect(spendInARS(row({ amount: 10, currency: 'USD', date: '2026-09-04' }), history, todayToARS)).toBe(14000)
  })

  it('antes del primer dato guardado usa el dólar de hoy', () => {
    expect(spendInARS(row({ amount: 10, currency: 'USD', date: '2026-08-20' }), history, todayToARS)).toBe(20000)
  })

  it('sin historia usa el dólar de hoy', () => {
    expect(spendInARS(row({ amount: 10, currency: 'USD' }), [], todayToARS)).toBe(20000)
  })

  // La historia solo guarda el dólar.
  it('otra moneda va con la cotización de hoy', () => {
    expect(spendInARS(row({ amount: 10, currency: 'EUR' }), history, todayToARS)).toBe(22000)
  })

  it('acepta montos que llegan como texto', () => {
    expect(spendInARS(row({ amount: '1500.50' }), history, todayToARS)).toBe(1500.5)
  })
})

describe('spentByKey', () => {
  it('suma pesos y dólares convertidos en la misma categoría', () => {
    const rows = [
      row({ amount: 5000 }),
      row({ amount: 10, currency: 'USD', date: '2026-09-01' }),
      row({ category_id: 'comida', amount: 700 }),
    ]
    expect(spentByKey(rows, r => r.category_id, history, todayToARS)).toEqual({ ocio: 19000, comida: 700 })
  })

  // El uso de un presupuesto no puede cambiar porque se movió el dólar: el
  // mismo gasto da lo mismo con cualquier cotización de hoy.
  it('no depende del dólar de hoy cuando hay historia', () => {
    const rows = [row({ amount: 10, currency: 'USD' })]
    const otherToday = (amount: number) => amount * 9999
    expect(spentByKey(rows, r => r.category_id, history, otherToday)).toEqual({ ocio: 15000 })
  })

  it('descarta las filas sin clave', () => {
    expect(spentByKey([row({ category_id: null, amount: 900 })], r => r.category_id, history, todayToARS)).toEqual({})
  })

  // El aviso diario agrupa gastos de todos los usuarios: la clave tiene que
  // separar a cada uno.
  it('agrupa por la clave que se le pase', () => {
    const rows = [
      { ...row({ amount: 100 }), user_id: 'a' },
      { ...row({ amount: 200 }), user_id: 'b' },
      { ...row({ amount: 300 }), user_id: 'a' },
    ]
    expect(spentByKey(rows, r => `${r.user_id}::${r.category_id}`, history, todayToARS)).toEqual({
      'a::ocio': 400,
      'b::ocio': 200,
    })
  })
})
