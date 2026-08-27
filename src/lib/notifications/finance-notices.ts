import { budgetUsage, savingGoalProgress, BUDGET_ALERT_THRESHOLD } from '@/lib/finance/rules'
import type { ToARS } from '@/lib/finance/summary'
import { formatCurrency } from '@/lib/utils/format-currency'
import type { NewNotification } from '@/types/notifications.types'

/**
 * Los avisos financieros, como funciones puras.
 *
 * Ninguna de estas funciones vuelve a calcular una regla: el uso de un
 * presupuesto y el progreso de una meta salen de `lib/finance/rules.ts`. Es
 * exactamente el bug de las metas (62% en una pantalla, 0% en otra) esperando
 * repetirse, ahora con un mail de por medio.
 */

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

/** `2026-08` → `agosto`. */
export function monthName(period: string): string {
  const month = Number(period.slice(5, 7))
  return MONTHS[month - 1] ?? period
}

// ─────────────────────────────────────────────────────────────
// Presupuestos
// ─────────────────────────────────────────────────────────────

export interface BudgetWithSpend {
  user_id: string
  category_id: string
  category_name: string
  amount: number
  spent: number
}

/**
 * Avisa al cruzar el 80% y al pasarse del 100%.
 *
 * Son dos avisos distintos y no uno que se repite: llegar al 80% es una
 * advertencia que todavía se puede accionar, y pasarse es un hecho consumado.
 * La clave lleva la categoría y el mes, así que cargar otro gasto en la misma
 * categoría **no genera un aviso nuevo** — que es la mitad del ticket.
 */
export function selectBudgetNotices(
  budgets: readonly BudgetWithSpend[],
  period: string,
): NewNotification[] {
  const notices: NewNotification[] = []

  for (const budget of budgets) {
    const usage = budgetUsage(budget)
    if (usage.limit <= 0) continue

    const spent = formatCurrency(usage.spent, 'ARS', 'rounded')
    const limit = formatCurrency(usage.limit, 'ARS', 'rounded')

    if (usage.overspent) {
      notices.push({
        userId: budget.user_id,
        type: 'presupuesto_excedido',
        title: `Te pasaste del presupuesto de ${budget.category_name}`,
        body: `${spent} de ${limit} · ${formatCurrency(usage.overspentBy, 'ARS', 'rounded')} de más`,
        link: '/finanzas?seccion=presupuestos',
        dedupeKey: `presu100:${budget.category_id}:${period}`,
      })
      continue
    }

    if (usage.ratio >= BUDGET_ALERT_THRESHOLD) {
      notices.push({
        userId: budget.user_id,
        type: 'presupuesto_alerta',
        title: `Presupuesto de ${budget.category_name} al ${usage.percent}%`,
        body: `${spent} de ${limit} · te quedan ${formatCurrency(usage.remaining, 'ARS', 'rounded')}`,
        link: '/finanzas?seccion=presupuestos',
        dedupeKey: `presu80:${budget.category_id}:${period}`,
      })
    }
  }

  return notices
}

// ─────────────────────────────────────────────────────────────
// Metas de ahorro
// ─────────────────────────────────────────────────────────────

export interface GoalForNotice {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  achieved: boolean
  wallet_ids: readonly string[]
}

export interface WalletForNotice {
  id: string
  user_id: string
  balance: number
  currency: string
}

/** Avisa una sola vez, para siempre, cuando una meta llega al 100%. */
export function selectGoalNotices(
  goals: readonly GoalForNotice[],
  wallets: readonly WalletForNotice[],
  toARS: ToARS,
): NewNotification[] {
  const notices: NewNotification[] = []

  for (const goal of goals) {
    // Ya marcada como lograda: el aviso no aporta nada.
    if (goal.achieved) continue

    const linked = wallets.filter(w => w.user_id === goal.user_id && goal.wallet_ids.includes(w.id))
    const progress = savingGoalProgress(goal, linked, toARS)
    if (!progress.reached) continue

    notices.push({
      userId: goal.user_id,
      type: 'meta_alcanzada',
      title: `Llegaste a la meta: ${goal.name}`,
      body: `${formatCurrency(progress.currentAmount, 'ARS', 'rounded')} de ${formatCurrency(goal.target_amount, 'ARS', 'rounded')}`,
      link: '/finanzas?seccion=metas',
      // Sin mes ni fecha: una meta se alcanza una vez.
      dedupeKey: `meta:${goal.id}`,
    })
  }

  return notices
}

// ─────────────────────────────────────────────────────────────
// Reporte mensual
// ─────────────────────────────────────────────────────────────

/** `2026-08-01` → `2026-07`. */
export function previousPeriod(today: string): string {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`
}

export function isFirstOfMonth(today: string): boolean {
  return today.slice(8, 10) === '01'
}

/**
 * Avisa que hay material para el reporte del mes pasado.
 *
 * Dice "listo para generar" y no "listo": el reporte lo arma Claude cuando el
 * usuario entra y lo pide, no el cron. Prometer un reporte que todavía no
 * existe es mandar a alguien a una pantalla vacía.
 */
export function selectMonthlyReportNotice(
  userId: string,
  period: string,
  transactionsInPeriod: number,
): NewNotification | null {
  if (transactionsInPeriod === 0) return null

  return {
    userId,
    type: 'reporte_mensual',
    title: `Tu reporte de ${monthName(period)} está listo para generar`,
    body: `Cerraste el mes con ${transactionsInPeriod} movimiento${transactionsInPeriod === 1 ? '' : 's'}.`,
    link: '/finanzas/reportes',
    dedupeKey: `reporte:${period}`,
  }
}

// ─────────────────────────────────────────────────────────────
// Resumen semanal
// ─────────────────────────────────────────────────────────────

export interface WeekWindow {
  from: string
  to: string
}

/** Suma días a una fecha `YYYY-MM-DD` sin que la zona horaria se meta. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const result = new Date(Date.UTC(year, month - 1, day + days))
  return result.toISOString().slice(0, 10)
}

/**
 * La semana que cerró y las 4 anteriores, contadas desde un lunes.
 *
 * De lunes a domingo, terminando ayer: el lunes a la mañana lo que interesa es
 * la semana que se fue, no la que arranca hoy.
 */
export function weekWindows(monday: string): { current: WeekWindow; previous: WeekWindow[] } {
  const current = { from: addDays(monday, -7), to: addDays(monday, -1) }
  const previous = [1, 2, 3, 4].map(offset => ({
    from: addDays(monday, -7 * (offset + 1)),
    to: addDays(monday, -7 * offset - 1),
  }))
  return { current, previous }
}

export function isMonday(today: string): boolean {
  const [year, month, day] = today.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 1
}

/**
 * Compara la semana que cerró contra el promedio de las 4 anteriores.
 *
 * Sin las 4 semanas de historia no se manda nada: "gastaste un 300% más que tu
 * promedio" cuando el promedio son dos semanas de uso es ruido, y un aviso que
 * se equivoca seguido entrena al usuario a ignorar todos los demás.
 */
export function selectWeeklyNotice(
  userId: string,
  weekStart: string,
  spentThisWeek: number,
  previousWeeks: readonly number[],
): NewNotification | null {
  if (previousWeeks.length < 4) return null

  const average = previousWeeks.reduce((sum, n) => sum + n, 0) / previousWeeks.length

  // Sin nada contra qué comparar no hay resumen. El aviso es la comparación:
  // "gastaste $ X" a secas ya está en la pantalla de movimientos.
  if (average <= 0) return null

  // Una semana sin gastos tampoco amerita un mail.
  if (spentThisWeek <= 0) return null

  const spent = formatCurrency(spentThisWeek, 'ARS', 'rounded')
  const diff = Math.round(((spentThisWeek - average) / average) * 100)

  const comparison = Math.abs(diff) < 5
    ? 'Prácticamente igual que tu promedio de las últimas 4 semanas.'
    : diff > 0
      ? `Un ${diff}% más que tu promedio de las últimas 4 semanas.`
      : `Un ${Math.abs(diff)}% menos que tu promedio de las últimas 4 semanas.`

  return {
    userId,
    type: 'resumen_semanal',
    title: `Gastaste ${spent} la semana pasada`,
    body: comparison,
    // El resumen es de gastos: la pestaña de movimientos es la que lo respalda.
    link: '/finanzas?seccion=transacciones',
    dedupeKey: `semana:${weekStart}`,
  }
}
