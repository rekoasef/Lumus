import { createHash, randomBytes, randomInt } from 'node:crypto'

/**
 * Reglas de las solicitudes de arrepentimiento y de baja (00037).
 *
 * La norma (Disposición 954/2025) pide dar un código de identificación dentro
 * de las 24 horas. Lumus lo da en el momento, en pantalla y por mail. La
 * Disposición 3/2026 permite además verificar la identidad con un paso
 * razonable: acá, un link al mail de la cuenta. Sin eso, cualquiera que supiera
 * tu mail podría darte de baja.
 */

export const CONSUMER_REQUEST_KINDS = ['arrepentimiento', 'baja'] as const
export type ConsumerRequestKind = (typeof CONSUMER_REQUEST_KINDS)[number]

const CODE_PREFIX: Record<ConsumerRequestKind, string> = {
  arrepentimiento: 'ARR',
  baja: 'BAJ',
}

/** Sin 0/O ni 1/I/L: el código se dicta por teléfono o se copia a mano. */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/** `ARR-7K2Q-M9XD`. 31^8 combinaciones: alcanza de sobra, y la base exige que sea único. */
export function generateRequestCode(kind: ConsumerRequestKind, random: (max: number) => number = randomInt): string {
  const chars = Array.from({ length: 8 }, () => CODE_ALPHABET[random(CODE_ALPHABET.length)])
  return `${CODE_PREFIX[kind]}-${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
}

/** El token del link de confirmación. Se manda por mail y nunca se guarda tal cual. */
export function generateConfirmToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Lo que se guarda en la base. SHA-256 alcanza: el token es aleatorio de 256 bits, no una contraseña. */
export function hashConfirmToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Más de esto por mail en una hora, y se devuelve la última solicitud en vez de crear otra. */
export const MAX_REQUESTS_PER_HOUR = 3

export function isRateLimited(requestsInLastHour: number): boolean {
  return requestsInLastHour >= MAX_REQUESTS_PER_HOUR
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Días hábiles entre dos fechas, sin contar sábados ni domingos.
 *
 * No descuenta feriados: el resultado es aproximado, por eso el mail al dueño
 * lo marca así y la decisión del reembolso la toma una persona.
 */
export function businessDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0
  const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
  let count = 0
  while (day < end) {
    day.setUTCDate(day.getUTCDate() + 1)
    const weekday = day.getUTCDay()
    if (weekday !== 0 && weekday !== 6) count++
  }
  return count
}

export function isExpired(expiresAt: string | null, now: Date): boolean {
  return !expiresAt || new Date(expiresAt) <= now
}
