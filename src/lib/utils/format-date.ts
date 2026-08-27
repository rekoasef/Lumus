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

/**
 * Cuánto hace que pasó algo, en castellano y corto.
 *
 * Para el centro de notificaciones: "hace 3 h" ubica mejor que una fecha
 * completa cuando lo que importa es si es de recién o de la semana pasada.
 */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000)

  if (minutes < 1) return 'recién'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `hace ${weeks} sem`

  return formatDate(iso, { day: 'numeric', month: 'short', year: undefined })
}
