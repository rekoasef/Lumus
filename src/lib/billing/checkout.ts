/**
 * Cuánto se espera la confirmación de un pago.
 *
 * `create-subscription` marca la fila como `pending` **antes** de mandar a
 * Mercado Pago: es lo que permite reconocer al que vuelve a mitad del pago.
 * Pero quien abre el checkout y no paga deja esa fila `pending` para siempre, y
 * `/suscripcion` le mostraba "Esperando la confirmación del pago…" en cada
 * visita, sin nada que esperar. Peor: el cartel convive con el botón, así que
 * la pantalla dice dos cosas a la vez.
 *
 * `pending` no distingue "está pagando ahora" de "abrió el checkout la semana
 * pasada". El tiempo desde que arrancó sí: pasada la ventana, se lo trata como
 * un checkout abandonado y la pantalla vuelve a ofrecer suscribirse.
 *
 * La otra mitad del arreglo no es una regla sino una consulta: antes de
 * mostrar nada, `/suscripcion` le pregunta a Mercado Pago cómo está la
 * suscripción de verdad (`reconcilePendingSubscription`). Si el pago salió y el
 * webhook se perdió, el estado se corrige solo.
 */

/**
 * Minutos que se espera la confirmación desde que arrancó el checkout.
 *
 * Generoso a propósito: el pago en Mercado Pago puede incluir validar una
 * tarjeta o entrar con otra cuenta. Un rato largo esperando de más es
 * incómodo; cortar antes de tiempo le dice "no pagaste" a alguien que sí.
 */
export const CHECKOUT_WAIT_MINUTES = 30

const MINUTE_MS = 60 * 1000

export interface CheckoutWaitInput {
  status: string | null
  /** `updated_at` de la fila: cuándo se abrió el último checkout. */
  startedAt: string | null
  now?: Date
}

/**
 * Si vale la pena mostrar "esperando la confirmación" y seguir consultando.
 *
 * Sin `startedAt` no se espera: una fila `pending` sin fecha es de antes de que
 * el checkout la sellara, y esperar para siempre es justamente el bug.
 */
export function isAwaitingPayment({ status, startedAt, now = new Date() }: CheckoutWaitInput): boolean {
  if (status !== 'pending' || !startedAt) return false

  const elapsed = now.getTime() - new Date(startedAt).getTime()
  if (Number.isNaN(elapsed)) return false

  return elapsed >= 0 && elapsed < CHECKOUT_WAIT_MINUTES * MINUTE_MS
}
