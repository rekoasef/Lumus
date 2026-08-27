import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Token de baja: firma un `user_id` para que el link del pie de un mail
 * funcione sin login.
 *
 * Es HMAC-SHA256, no un JWT ni una fila en la base. No hace falta más: el
 * token no autoriza nada, solo prueba que quien entró al link recibió el mail.
 * Lo peor que puede hacer alguien con un token robado es dejar de mandarle
 * mails a su dueño — molesto, no peligroso, y reversible desde el perfil.
 *
 * No vence a propósito: un link de baja que caduca es un link de baja roto,
 * y un mail viejo en la bandeja de alguien tiene que poder darlo de baja.
 */

const SEPARATOR = '.'

function secret(): string {
  const value = process.env.NOTIFICATIONS_UNSUBSCRIBE_SECRET
  if (!value) throw new Error('Falta NOTIFICATIONS_UNSUBSCRIBE_SECRET')
  return value
}

function sign(userId: string, key: string): string {
  return createHmac('sha256', key).update(userId).digest('base64url')
}

export function createUnsubscribeToken(userId: string): string {
  return `${userId}${SEPARATOR}${sign(userId, secret())}`
}

/** Devuelve el `user_id` si la firma es válida, o `null` si no lo es. */
export function readUnsubscribeToken(token: string): string | null {
  const at = token.lastIndexOf(SEPARATOR)
  if (at <= 0) return null

  const userId = token.slice(0, at)
  const received = Buffer.from(token.slice(at + 1))
  const expected = Buffer.from(sign(userId, secret()))

  // Comparar con `===` filtra el secreto por el tiempo que tarda en fallar.
  if (received.length !== expected.length) return null
  return timingSafeEqual(received, expected) ? userId : null
}
