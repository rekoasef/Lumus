import { describe, it, expect } from 'vitest'
import { budgetUsage, monthlyRecurringAmount, savingGoalProgress, savingsRate, BUDGET_ALERT_THRESHOLD } from './rules'
import type { ToARS } from './summary'

/** Cotización fija para los tests: 1 USD = 1000 ARS. */
const toARS: ToARS = (amount, currency) => (currency === 'ARS' ? amount : amount * 1000)

describe('savingGoalProgress', () => {
  it('sin billeteras vinculadas usa el monto cargado a mano', () => {
    const progress = savingGoalProgress({ target_amount: 1000, current_amount: 250 }, [], toARS)

    expect(progress.currentAmount).toBe(250)
    expect(progress.percent).toBe(25)
    expect(progress.remaining).toBe(750)
    expect(progress.reached).toBe(false)
  })

  it('con billeteras vinculadas ignora current_amount y suma los balances', () => {
    // Este es el bug del 2026-08-26: el dashboard leía `current_amount` a pelo
    // y mostraba 0% en una meta que la card de finanzas mostraba al 62%.
    const progress = savingGoalProgress(
      { target_amount: 1000, current_amount: 0 },
      [{ balance: 400, currency: 'ARS' }, { balance: 220, currency: 'ARS' }],
      toARS,
    )

    expect(progress.currentAmount).toBe(620)
    expect(progress.percent).toBe(62)
  })

  it('convierte a ARS las billeteras en otra moneda antes de sumar', () => {
    const progress = savingGoalProgress(
      { target_amount: 2000, current_amount: 0 },
      [{ balance: 1, currency: 'USD' }, { balance: 500, currency: 'ARS' }],
      toARS,
    )

    expect(progress.currentAmount).toBe(1500)
    expect(progress.percent).toBe(75)
  })

  it('con objetivo en 0 no divide por cero ni se dibuja completa', () => {
    const progress = savingGoalProgress({ target_amount: 0, current_amount: 500 }, [], toARS)

    expect(progress.ratio).toBe(0)
    expect(progress.percent).toBe(0)
    expect(progress.reached).toBe(false)
  })

  it('recorta el progreso al 100% aunque se haya ahorrado de más', () => {
    const progress = savingGoalProgress({ target_amount: 1000, current_amount: 1500 }, [], toARS)

    expect(progress.ratio).toBe(1)
    expect(progress.percent).toBe(100)
    expect(progress.remaining).toBe(0)
    expect(progress.reached).toBe(true)
  })

  it('no devuelve progreso negativo si la billetera está en rojo', () => {
    const progress = savingGoalProgress(
      { target_amount: 1000, current_amount: 0 },
      [{ balance: -300, currency: 'ARS' }],
      toARS,
    )

    expect(progress.currentAmount).toBe(-300)
    expect(progress.ratio).toBe(0)
    expect(progress.percent).toBe(0)
  })
})

describe('budgetUsage', () => {
  it('calcula gastado, restante y porcentaje', () => {
    const usage = budgetUsage({ amount: 1000, spent: 400 })

    expect(usage.percent).toBe(40)
    expect(usage.remaining).toBe(600)
    expect(usage.overspent).toBe(false)
    expect(usage.status).toBe('ok')
  })

  it('avisa al llegar al umbral de alerta', () => {
    const usage = budgetUsage({ amount: 1000, spent: 1000 * BUDGET_ALERT_THRESHOLD })

    expect(usage.status).toBe('warning')
    expect(usage.overspent).toBe(false)
  })

  it('un presupuesto excedido reporta más de 100% y cuánto se pasó', () => {
    const usage = budgetUsage({ amount: 1000, spent: 1400 })

    expect(usage.percent).toBe(140)
    expect(usage.overspent).toBe(true)
    expect(usage.overspentBy).toBe(400)
    expect(usage.status).toBe('danger')
    // La barra no se pasa del ancho de la card aunque el gasto sí.
    expect(usage.ratioClamped).toBe(1)
    expect(usage.remaining).toBe(0)
  })

  it('un presupuesto sin límite no divide por cero', () => {
    expect(budgetUsage({ amount: 0, spent: 500 }).percent).toBe(0)
    expect(budgetUsage({ amount: 0, spent: 500 }).status).toBe('danger')
  })

  it('trata un gasto nulo como cero', () => {
    expect(budgetUsage({ amount: 1000, spent: null }).spent).toBe(0)
    expect(budgetUsage({ amount: 1000 }).percent).toBe(0)
  })
})

describe('monthlyRecurringAmount', () => {
  it('un gasto mensual vale lo que dice', () => {
    expect(monthlyRecurringAmount(5000, 'monthly')).toBe(5000)
  })

  it('un gasto diario se multiplica por 30', () => {
    expect(monthlyRecurringAmount(100, 'daily')).toBe(3000)
  })

  it('un gasto semanal usa 52 semanas al año, no 4 al mes', () => {
    // 4 semanas por mes se come 4 pagos al año: 52/12 ≈ 4,33.
    expect(monthlyRecurringAmount(1000, 'weekly')).toBeCloseTo(4333.33, 2)
  })
})

describe('savingsRate', () => {
  it('es la parte de los ingresos que no se gastó', () => {
    expect(savingsRate(1000, 750)).toBeCloseTo(25)
  })

  it('es negativa cuando se gastó más de lo que entró', () => {
    expect(savingsRate(1000, 1200)).toBeCloseTo(-20)
  })

  it('un mes sin ingresos no tiene tasa, no tiene tasa cero', () => {
    expect(savingsRate(0, 5000)).toBeNull()
    expect(savingsRate(-100, 5000)).toBeNull()
  })
})
