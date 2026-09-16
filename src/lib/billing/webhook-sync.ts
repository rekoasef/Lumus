/**
 * Qué se escribe en `billing_subscriptions` a partir del estado de una
 * suscripción en Mercado Pago. Puro, para poder probar la regla que importa:
 * **`paid_until` solo avanza mientras la suscripción está autorizada, y nunca
 * se borra.** Cancelar no le quita a nadie los días que ya pagó (00035).
 */

export interface MpPreapproval {
  id: string
  /** 'pending' | 'authorized' | 'paused' | 'cancelled' */
  status: string
  next_payment_date?: string | null
}

export interface SubscriptionUpdate {
  status: string
  next_payment_date: string | null
  updated_at: string
  paid_until?: string
}

export function subscriptionUpdateFromMp(preapproval: MpPreapproval, now: Date): SubscriptionUpdate {
  const nextPayment = preapproval.next_payment_date ?? null

  const update: SubscriptionUpdate = {
    status: preapproval.status,
    next_payment_date: nextPayment,
    updated_at: now.toISOString(),
  }

  // Sin la clave, el update no toca la columna: el período pago que ya estaba
  // queda como estaba.
  if (preapproval.status === 'authorized' && nextPayment) {
    update.paid_until = new Date(nextPayment).toISOString()
  }

  return update
}
