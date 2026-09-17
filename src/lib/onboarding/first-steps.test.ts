import { describe, expect, it } from 'vitest'
import { HABIT_DAYS, allStepsDone, firstSteps } from './first-steps'

const byId = (steps: ReturnType<typeof firstSteps>) => Object.fromEntries(steps.map(s => [s.id, s]))

describe('firstSteps', () => {
  it('una cuenta vacía no tiene nada hecho', () => {
    const steps = firstSteps({ walletCount: 0, expenseDates: [], budgetCount: 0 })
    expect(steps.map(s => s.done)).toEqual([false, false, false, false])
    expect(byId(steps).habit.progress).toBe(0)
  })

  // El hábito son días distintos: tres gastos el mismo día no son un hábito.
  it('cuenta días distintos, no gastos', () => {
    const steps = byId(firstSteps({ walletCount: 1, expenseDates: ['2026-09-17', '2026-09-17', '2026-09-17'], budgetCount: 0 }))
    expect(steps.first_expense.done).toBe(true)
    expect(steps.habit.done).toBe(false)
    expect(steps.habit.progress).toBe(1)
  })

  it('el hábito se completa con HABIT_DAYS días y el progreso no pasa de ahí', () => {
    const dates = ['2026-09-10', '2026-09-12', '2026-09-11', '2026-09-15', '2026-09-16']
    const steps = byId(firstSteps({ walletCount: 1, expenseDates: dates, budgetCount: 0 }))
    expect(steps.habit.done).toBe(true)
    expect(steps.habit.progress).toBe(HABIT_DAYS)
  })

  it('todo hecho', () => {
    const steps = firstSteps({ walletCount: 2, expenseDates: ['2026-09-01', '2026-09-02', '2026-09-03'], budgetCount: 1 })
    expect(allStepsDone(steps)).toBe(true)
  })

  it('falta uno y no está todo hecho', () => {
    const steps = firstSteps({ walletCount: 2, expenseDates: ['2026-09-01', '2026-09-02', '2026-09-03'], budgetCount: 0 })
    expect(allStepsDone(steps)).toBe(false)
  })
})
