import type { RecurringRepeatType } from '@/types/finance.types'

/**
 * Qué vencimientos hay que avisar hoy, como función pura.
 *
 * Está separada de la ruta del cron para poder probarla sin base ni mails:
 * es la regla que decide si a alguien le llega un mail, y equivocarse acá es
 * mandar un aviso de más (molesto) o de menos (el seguro vence).
 */

/** Desde cuántos días antes se avisa. */
export const DUE_SOON_DAYS = 3

/**
 * Las dos fases en las que se avisa un mismo vencimiento.
 *
 * Son dos y no una porque avisar solo tres días antes hace que el aviso llegue
 * cuando todavía no podés pagarlo y no llegue el día que sí. Y son dos y no
 * cuatro (3, 2, 1, 0 días) porque un aviso por día del mismo gasto es la forma
 * más rápida de que alguien apague los avisos.
 */
export type DuePhase = 'proximo' | 'vencido'

export interface RecurringDue {
  id: string
  user_id: string
  description: string | null
  amount: number
  type: 'gasto' | 'ingreso'
  repeat_type: RecurringRepeatType
  next_date: string
  active: boolean
}

export interface DueNotice {
  recurring: RecurringDue
  phase: DuePhase
  /** Negativo = ya venció. 0 = vence hoy. */
  daysUntil: number
  /** Identidad del hecho avisado: mismo vencimiento, misma fecha, misma fase. */
  dedupeKey: string
}

/** Días entre dos fechas `YYYY-MM-DD`, sin que la zona horaria se meta. */
export function daysBetween(from: string, to: string): number {
  const start = Date.UTC(...splitDate(from))
  const end = Date.UTC(...splitDate(to))
  return Math.round((end - start) / 86_400_000)
}

function splitDate(date: string): [number, number, number] {
  const [year, month, day] = date.split('-').map(Number)
  return [year, month - 1, day]
}

export function dueDedupeKey(recurringId: string, nextDate: string, phase: DuePhase): string {
  return `venc:${recurringId}:${nextDate}:${phase}`
}

/**
 * Filtra los recurrentes que ameritan aviso hoy.
 *
 * `today` entra por parámetro y no se lee de `new Date()` adentro: el cron
 * corre en UTC y el usuario vive en UTC-3, así que qué día es "hoy" lo decide
 * quien llama, no esta función.
 */
export function selectDueNotices(recurring: readonly RecurringDue[], today: string): DueNotice[] {
  const notices: DueNotice[] = []

  for (const item of recurring) {
    if (!item.active) continue

    const daysUntil = daysBetween(today, item.next_date)
    if (daysUntil > DUE_SOON_DAYS) continue

    const phase: DuePhase = daysUntil < 0 ? 'vencido' : 'proximo'
    notices.push({
      recurring: item,
      phase,
      daysUntil,
      dedupeKey: dueDedupeKey(item.id, item.next_date, phase),
    })
  }

  // Lo más urgente primero: primero lo vencido, después lo que vence antes.
  return notices.sort((a, b) => a.daysUntil - b.daysUntil)
}
