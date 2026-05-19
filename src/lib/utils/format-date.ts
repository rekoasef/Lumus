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
