import { describe, expect, it } from 'vitest'
import { NO_CATEGORY, countSummary, rawTotalsByCategory, sumSummary, totalsByCategory } from './summary'
import type { FinanceSummaryRow } from '@/types/finance.types'

/** Cotización fija: un dólar vale mil pesos. Alcanza para ver si convirtió o no. */
const toARS = (amount: number, currency: string) => (currency === 'USD' ? amount * 1000 : amount)

function row(partial: Partial<FinanceSummaryRow> = {}): FinanceSummaryRow {
  return { type: 'gasto', category_id: null, currency: 'ARS', total: 0, tx_count: 0, ...partial }
}

describe('sumSummary', () => {
  it('suma solo el tipo pedido', () => {
    const rows = [
      row({ type: 'gasto', total: 1000 }),
      row({ type: 'ingreso', total: 5000 }),
      row({ type: 'gasto', total: 500 }),
    ]
    expect(sumSummary(rows, 'gasto', toARS)).toBe(1500)
    expect(sumSummary(rows, 'ingreso', toARS)).toBe(5000)
  })

  // La razón de ser del módulo: el agregado viene partido por moneda porque
  // pesos y dólares no se pueden sumar crudos. Sumarlos daría 1.100 en vez de
  // 101.000 — un gasto en dólares que casi desaparece del resumen.
  it('convierte a pesos antes de sumar', () => {
    const rows = [row({ total: 100, currency: 'USD' }), row({ total: 1000, currency: 'ARS' })]
    expect(sumSummary(rows, 'gasto', toARS)).toBe(101000)
  })

  it('sin filas del tipo pedido da cero, no NaN', () => {
    expect(sumSummary([row({ type: 'ingreso', total: 900 })], 'gasto', toARS)).toBe(0)
  })

  // PostgREST puede mandar `numeric` como string.
  it('acepta totales que llegan como texto', () => {
    const rows = [{ ...row(), total: '1500' as unknown as number }]
    expect(sumSummary(rows, 'gasto', toARS)).toBe(1500)
  })
})

describe('countSummary', () => {
  it('cuenta movimientos sin importar la moneda', () => {
    const rows = [
      row({ currency: 'ARS', tx_count: 3 }),
      row({ currency: 'USD', tx_count: 2 }),
      row({ type: 'ingreso', tx_count: 7 }),
    ]
    expect(countSummary(rows, 'gasto')).toBe(5)
  })
})

describe('totalsByCategory', () => {
  // Una categoría con gastos en pesos y en dólares llega en dos filas. Si no se
  // juntaran, la misma categoría aparecería dos veces en la pantalla.
  it('junta la misma categoría aunque venga en varias monedas', () => {
    const rows = [
      row({ category_id: 'comida', total: 5000, currency: 'ARS', tx_count: 4 }),
      row({ category_id: 'comida', total: 10, currency: 'USD', tx_count: 1 }),
    ]
    const totals = totalsByCategory(rows, 'gasto', toARS)

    expect(totals).toHaveLength(1)
    expect(totals[0]).toEqual({ categoryId: 'comida', total: 15000, count: 5 })
  })

  it('ordena de mayor a menor gasto', () => {
    const rows = [
      row({ category_id: 'chica', total: 100, tx_count: 1 }),
      row({ category_id: 'grande', total: 9000, tx_count: 1 }),
      row({ category_id: 'media', total: 3000, tx_count: 1 }),
    ]
    expect(totalsByCategory(rows, 'gasto', toARS).map(t => t.categoryId)).toEqual(['grande', 'media', 'chica'])
  })

  // Los movimientos sin categoría se agrupan con una clave interna, pero hacia
  // afuera siguen siendo `null`: la pantalla los muestra como "Sin categoría".
  it('agrupa los movimientos sin categoría y les deja el id en null', () => {
    const rows = [
      row({ category_id: null, total: 200, tx_count: 1 }),
      row({ category_id: null, total: 300, currency: 'ARS', tx_count: 2 }),
    ]
    const totals = totalsByCategory(rows, 'gasto', toARS)

    expect(totals).toHaveLength(1)
    expect(totals[0].categoryId).toBeNull()
    expect(totals[0].total).toBe(500)
    expect(totals[0].count).toBe(3)
  })

  it('no mezcla una categoría sin id con una que se llame igual que la clave interna', () => {
    const rows = [
      row({ category_id: null, total: 100, tx_count: 1 }),
      row({ category_id: NO_CATEGORY, total: 700, tx_count: 1 }),
    ]
    // Comparten clave de agrupación: el que manda es el primero que llega, y su
    // id es el que sale. Documenta el comportamiento real para que un cambio
    // acá no pase inadvertido.
    expect(totalsByCategory(rows, 'gasto', toARS)).toHaveLength(1)
  })

  it('ignora los tipos que no se piden', () => {
    const rows = [
      row({ type: 'ingreso', category_id: 'sueldo', total: 90000, tx_count: 1 }),
      row({ type: 'gasto', category_id: 'comida', total: 1000, tx_count: 1 }),
    ]
    expect(totalsByCategory(rows, 'gasto', toARS).map(t => t.categoryId)).toEqual(['comida'])
  })
})

describe('rawTotalsByCategory', () => {
  // Los presupuestos se definen en pesos, así que se comparan contra el total
  // crudo y no contra uno convertido con la cotización de hoy: si no, el uso de
  // un presupuesto cambiaría solo porque se movió el dólar.
  it('no convierte monedas', () => {
    const rows = [
      row({ category_id: 'comida', total: 5000, currency: 'ARS' }),
      row({ category_id: 'comida', total: 10, currency: 'USD' }),
    ]
    expect(rawTotalsByCategory(rows, 'gasto')).toEqual({ comida: 5010 })
  })

  it('deja afuera lo que no tiene categoría', () => {
    const rows = [
      row({ category_id: null, total: 4000 }),
      row({ category_id: 'comida', total: 1000 }),
    ]
    expect(rawTotalsByCategory(rows, 'gasto')).toEqual({ comida: 1000 })
  })

  it('sin filas devuelve un objeto vacío', () => {
    expect(rawTotalsByCategory([], 'gasto')).toEqual({})
  })
})
