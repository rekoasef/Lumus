/**
 * Devuelve la fecha en formato YYYY-MM-DD usando la hora LOCAL del navegador.
 * Usar siempre en lugar de `new Date().toISOString().slice(0,10)` que usa UTC
 * y falla en zonas UTC-X entre medianoche y las X:00am.
 */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  }).format(d)
}

export function getGreeting(name: string): string {
  const hour = new Date().getHours()
  if (hour < 12) return `Buenos días, ${name}`
  if (hour < 19) return `Buenas tardes, ${name}`
  return `Buenas noches, ${name}`
}
