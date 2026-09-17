/**
 * La lista de "primeros pasos" del panel.
 *
 * Existe porque una prueba de 30 días se gana o se pierde en la primera
 * semana: quien carga gastos varios días seguidos agarra el hábito, y quien
 * carga dos y se olvida no paga (ver `docs/LANZAMIENTO.md`, sección 7). La
 * lista empuja a eso sin tutoriales, y desaparece cuando se completa.
 *
 * "Instalar en el celular" no está acá: lo sabe solo el navegador.
 */

/** Días distintos con gastos para dar por hecho el hábito. */
export const HABIT_DAYS = 3

export type FirstStepId = 'wallet' | 'first_expense' | 'habit' | 'budget'

export interface FirstStep {
  id: FirstStepId
  done: boolean
  /** Solo en el hábito: cuántos días lleva de `HABIT_DAYS`. */
  progress?: number
}

export interface FirstStepsInput {
  walletCount: number
  /** Fechas (`YYYY-MM-DD`) de gastos. Pueden venir repetidas y en cualquier orden. */
  expenseDates: readonly string[]
  budgetCount: number
}

export function firstSteps(input: FirstStepsInput): FirstStep[] {
  const expenseDays = new Set(input.expenseDates).size

  return [
    { id: 'wallet', done: input.walletCount > 0 },
    { id: 'first_expense', done: expenseDays > 0 },
    { id: 'habit', done: expenseDays >= HABIT_DAYS, progress: Math.min(expenseDays, HABIT_DAYS) },
    { id: 'budget', done: input.budgetCount > 0 },
  ]
}

export function allStepsDone(steps: readonly FirstStep[]): boolean {
  return steps.every(s => s.done)
}
