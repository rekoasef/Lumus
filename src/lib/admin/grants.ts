/**
 * Duraciones de acceso de cortesía que ofrece el panel.
 *
 * "Sin vencimiento" está, pero no es el default: la decisión del 2026-08-27 fue
 * cargar el vencimiento desde el día uno, porque sacarle un acceso indefinido a
 * alguien es una conversación incómoda y uno que vencía desde el principio, no.
 */
export const ACCESS_DURATIONS: readonly { label: string; days: number | null }[] = [
  { label: '1 mes', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: 'Sin vencimiento', days: null },
]

export const DEFAULT_ACCESS_DAYS = 90

/** Lo que se ofrece para extender una cortesía existente. */
export const EXTENSION_OPTIONS: readonly { label: string; days: number }[] = [
  { label: '+1 mes', days: 30 },
  { label: '+3 meses', days: 90 },
]

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * El vencimiento nuevo al extender una cortesía.
 *
 * Se suma desde el vencimiento actual si todavía no llegó, y desde hoy si ya
 * pasó: extender un mes a alguien a quien le quedan diez días le da cuarenta,
 * no un mes contado desde hoy que le robaría esos diez. Y a un acceso vencido
 * hace dos meses, sumarle uno desde su vencimiento lo dejaría vencido igual.
 */
export function extendedExpiry(currentExpiresAt: string, days: number, now: Date): string {
  const base = Math.max(new Date(currentExpiresAt).getTime(), now.getTime())
  return new Date(base + days * DAY_MS).toISOString()
}

/** Días que le quedan a una cortesía, redondeando para arriba. Negativo si venció. */
export function daysUntil(iso: string, now: Date): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS)
}
