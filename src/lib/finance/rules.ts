import type { RecurringRepeatType } from '@/types/finance.types'
import type { ToARS } from './summary'

/**
 * Las reglas de negocio de finanzas, como funciones puras.
 *
 * Están acá y no en los componentes por el bug del 2026-08-26: el progreso de
 * una meta se calculaba en dos pantallas con criterios distintos y la misma
 * meta mostraba 62% en una y 0% en la otra. Cualquier regla que dos pantallas
 * necesiten contestar igual va en este archivo.
 */

// ─────────────────────────────────────────────────────────────
// Metas de ahorro
// ─────────────────────────────────────────────────────────────

export interface SavingGoalProgress {
  /** Lo ahorrado hasta hoy, en ARS. */
  currentAmount: number
  /** 0 a 1, recortado — sirve para el ancho de una barra. */
  ratio: number
  /** 0 a 100, entero. */
  percent: number
  /** Lo que falta para llegar. Nunca negativo. */
  remaining: number
  /** Si ya se llegó al objetivo por monto (distinto de la marca manual `achieved`). */
  reached: boolean
}

/**
 * Progreso de una meta de ahorro.
 *
 * La regla que se perdía entre pantallas: **si la meta tiene billeteras
 * vinculadas, la suma de sus balances ES el progreso** y `current_amount` se
 * ignora. Solo cuando no hay ninguna vinculada vale lo que se cargó a mano.
 */
export function savingGoalProgress(
  goal: { target_amount: number; current_amount: number },
  linkedWallets: readonly { balance: number; currency: string }[],
  toARS: ToARS,
): SavingGoalProgress {
  const currentAmount = linkedWallets.length > 0
    ? linkedWallets.reduce((sum, wallet) => sum + toARS(Number(wallet.balance ?? 0), wallet.currency ?? 'ARS'), 0)
    : goal.current_amount

  // Una meta con objetivo 0 no es un error de datos: es una meta recién creada.
  // Sin este guard la división da Infinity y la barra se dibuja al 100%.
  const ratio = goal.target_amount > 0
    ? Math.min(Math.max(currentAmount / goal.target_amount, 0), 1)
    : 0

  return {
    currentAmount,
    ratio,
    percent: Math.round(ratio * 100),
    remaining: Math.max(goal.target_amount - currentAmount, 0),
    reached: goal.target_amount > 0 && currentAmount >= goal.target_amount,
  }
}

// ─────────────────────────────────────────────────────────────
// Presupuestos
// ─────────────────────────────────────────────────────────────

/** A partir de acá el presupuesto se muestra en amarillo. */
export const BUDGET_ALERT_THRESHOLD = 0.8

export type BudgetStatus = 'ok' | 'warning' | 'danger'

export interface BudgetUsage {
  spent: number
  limit: number
  /** Sin recortar: un presupuesto sobregirado tiene que poder decir 140%. */
  ratio: number
  /** 0 a 100+, entero. */
  percent: number
  /** Recortado a 1, para el ancho de la barra. */
  ratioClamped: number
  /** Lo que queda del límite. Nunca negativo. */
  remaining: number
  /** Cuánto se pasó del límite. 0 si no se pasó. */
  overspentBy: number
  overspent: boolean
  status: BudgetStatus
}

export function budgetUsage(budget: { amount: number; spent?: number | null }): BudgetUsage {
  const spent = budget.spent ?? 0
  const limit = budget.amount
  const ratio = limit > 0 ? spent / limit : 0
  const overspent = spent > limit

  return {
    spent,
    limit,
    ratio,
    percent: Math.round(ratio * 100),
    ratioClamped: Math.min(ratio, 1),
    remaining: Math.max(limit - spent, 0),
    overspentBy: overspent ? spent - limit : 0,
    overspent,
    status: overspent ? 'danger' : ratio >= BUDGET_ALERT_THRESHOLD ? 'warning' : 'ok',
  }
}

// ─────────────────────────────────────────────────────────────
// Vencimientos recurrentes
// ─────────────────────────────────────────────────────────────

const DAYS_PER_MONTH = 30
const WEEKS_PER_MONTH = 52 / 12

/**
 * Lleva un recurrente a lo que representa por mes, para poder sumar en la misma
 * unidad un gasto diario, uno semanal y uno mensual.
 */
export function monthlyRecurringAmount(amount: number, repeatType: RecurringRepeatType): number {
  switch (repeatType) {
    case 'daily':   return amount * DAYS_PER_MONTH
    case 'weekly':  return amount * WEEKS_PER_MONTH
    case 'monthly': return amount
  }
}
