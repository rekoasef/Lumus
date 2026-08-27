import { describe, it, expect } from 'vitest'
import {
  addDays,
  isFirstOfMonth,
  isMonday,
  monthName,
  previousPeriod,
  selectBudgetNotices,
  selectGoalNotices,
  selectMonthlyReportNotice,
  selectWeeklyNotice,
  weekWindows,
  type BudgetWithSpend,
  type GoalForNotice,
} from './finance-notices'
import type { ToARS } from '@/lib/finance/summary'

const toARS: ToARS = (amount, currency) => (currency === 'ARS' ? amount : amount * 1000)

function budget(overrides: Partial<BudgetWithSpend> = {}): BudgetWithSpend {
  return { user_id: 'user-1', category_id: 'cat-1', category_name: 'Comida', amount: 100000, spent: 0, ...overrides }
}

describe('selectBudgetNotices', () => {
  it('no avisa nada por debajo del 80%', () => {
    expect(selectBudgetNotices([budget({ spent: 79000 })], '2026-08')).toHaveLength(0)
  })

  it('avisa al cruzar el 80%', () => {
    const [notice] = selectBudgetNotices([budget({ spent: 82000 })], '2026-08')

    expect(notice.type).toBe('presupuesto_alerta')
    expect(notice.title).toContain('Comida')
    expect(notice.title).toContain('82%')
  })

  it('la clave lleva categoría y mes, así cargar otro gasto no genera otro aviso', () => {
    // Es la mitad del ticket: el dedupe_key tiene que ser igual entre corridas
    // aunque el monto gastado cambie.
    const [primera] = selectBudgetNotices([budget({ spent: 82000 })], '2026-08')
    const [segunda] = selectBudgetNotices([budget({ spent: 91000 })], '2026-08')

    expect(primera.dedupeKey).toBe(segunda.dedupeKey)
    expect(primera.dedupeKey).toBe('presu80:cat-1:2026-08')
  })

  it('el mes siguiente sí es un aviso nuevo', () => {
    const [agosto] = selectBudgetNotices([budget({ spent: 82000 })], '2026-08')
    const [septiembre] = selectBudgetNotices([budget({ spent: 82000 })], '2026-09')

    expect(agosto.dedupeKey).not.toBe(septiembre.dedupeKey)
  })

  it('pasarse es otro aviso distinto del 80%', () => {
    const [notice] = selectBudgetNotices([budget({ spent: 140000 })], '2026-08')

    expect(notice.type).toBe('presupuesto_excedido')
    expect(notice.dedupeKey).toBe('presu100:cat-1:2026-08')
    expect(notice.body).toContain('de más')
  })

  it('excedido reemplaza a la alerta, no se mandan los dos juntos', () => {
    expect(selectBudgetNotices([budget({ spent: 140000 })], '2026-08')).toHaveLength(1)
  })

  it('un presupuesto en 0 no avisa nada', () => {
    expect(selectBudgetNotices([budget({ amount: 0, spent: 500 })], '2026-08')).toHaveLength(0)
  })
})

describe('selectGoalNotices', () => {
  function goal(overrides: Partial<GoalForNotice> = {}): GoalForNotice {
    return {
      id: 'goal-1',
      user_id: 'user-1',
      name: 'Vacaciones',
      target_amount: 100000,
      current_amount: 0,
      achieved: false,
      wallet_ids: [],
      ...overrides,
    }
  }

  it('avisa cuando la meta llega al 100%', () => {
    const [notice] = selectGoalNotices([goal({ current_amount: 100000 })], [], toARS)

    expect(notice.type).toBe('meta_alcanzada')
    expect(notice.title).toContain('Vacaciones')
    expect(notice.dedupeKey).toBe('meta:goal-1')
  })

  it('no avisa una meta a medio camino', () => {
    expect(selectGoalNotices([goal({ current_amount: 50000 })], [], toARS)).toHaveLength(0)
  })

  it('no vuelve a avisar una meta ya marcada como lograda', () => {
    expect(selectGoalNotices([goal({ current_amount: 100000, achieved: true })], [], toARS)).toHaveLength(0)
  })

  it('usa las billeteras vinculadas, igual que las pantallas', () => {
    const notices = selectGoalNotices(
      [goal({ current_amount: 0, wallet_ids: ['w1'] })],
      [{ id: 'w1', user_id: 'user-1', balance: 120, currency: 'USD' }],
      toARS,
    )

    expect(notices).toHaveLength(1)
  })

  it('no cuenta la billetera de otro usuario', () => {
    const notices = selectGoalNotices(
      [goal({ current_amount: 0, wallet_ids: ['w1'] })],
      [{ id: 'w1', user_id: 'otro-usuario', balance: 999999, currency: 'ARS' }],
      toARS,
    )

    expect(notices).toHaveLength(0)
  })
})

describe('reporte mensual', () => {
  it('previousPeriod cruza el año hacia atrás', () => {
    expect(previousPeriod('2026-08-01')).toBe('2026-07')
    expect(previousPeriod('2026-01-01')).toBe('2025-12')
  })

  it('monthName traduce el período', () => {
    expect(monthName('2026-07')).toBe('julio')
  })

  it('isFirstOfMonth solo el día 1', () => {
    expect(isFirstOfMonth('2026-08-01')).toBe(true)
    expect(isFirstOfMonth('2026-08-02')).toBe(false)
  })

  it('no avisa un mes sin movimientos', () => {
    expect(selectMonthlyReportNotice('user-1', '2026-07', 0)).toBeNull()
  })

  it('avisa que hay material y manda a reportes', () => {
    const notice = selectMonthlyReportNotice('user-1', '2026-07', 42)

    expect(notice?.title).toContain('julio')
    expect(notice?.link).toBe('/finanzas/reportes')
    expect(notice?.dedupeKey).toBe('reporte:2026-07')
  })
})

describe('resumen semanal', () => {
  it('isMonday reconoce el lunes', () => {
    expect(isMonday('2026-08-24')).toBe(true)
    expect(isMonday('2026-08-27')).toBe(false)
  })

  it('addDays cruza meses sin desviarse', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31')
  })

  it('weekWindows arma la semana que cerró y las 4 anteriores', () => {
    const { current, previous } = weekWindows('2026-08-24')

    expect(current).toEqual({ from: '2026-08-17', to: '2026-08-23' })
    expect(previous).toHaveLength(4)
    expect(previous[0]).toEqual({ from: '2026-08-10', to: '2026-08-16' })
    expect(previous[3]).toEqual({ from: '2026-07-20', to: '2026-07-26' })
  })

  it('no manda nada sin historial contra qué comparar', () => {
    // Un "300% más que tu promedio" cuando el promedio es cero es ruido, y un
    // aviso que se equivoca entrena a ignorar todos los demás.
    expect(selectWeeklyNotice('user-1', '2026-08-17', 50000, [0, 0, 0, 0])).toBeNull()
  })

  it('no manda nada en una semana sin gastos', () => {
    expect(selectWeeklyNotice('user-1', '2026-08-17', 0, [10000, 10000, 10000, 10000])).toBeNull()
  })

  it('compara contra el promedio de las 4 anteriores', () => {
    const notice = selectWeeklyNotice('user-1', '2026-08-17', 15000, [10000, 10000, 10000, 10000])

    expect(notice?.body).toContain('50% más')
    expect(notice?.dedupeKey).toBe('semana:2026-08-17')
  })

  it('una diferencia chica se dice como "prácticamente igual"', () => {
    const notice = selectWeeklyNotice('user-1', '2026-08-17', 10200, [10000, 10000, 10000, 10000])

    expect(notice?.body).toContain('Prácticamente igual')
  })

  it('gastar menos se dice en positivo, no con un número negativo', () => {
    const notice = selectWeeklyNotice('user-1', '2026-08-17', 6000, [10000, 10000, 10000, 10000])

    expect(notice?.body).toContain('40% menos')
    expect(notice?.body).not.toContain('-')
  })
})
