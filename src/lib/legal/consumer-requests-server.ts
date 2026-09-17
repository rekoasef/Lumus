import { createServiceClient } from '@/lib/supabase/service'
import { cancelSubscriptionFor } from '@/lib/billing/cancel'
import {
  businessDaysBetween,
  generateConfirmToken,
  generateRequestCode,
  hashConfirmToken,
  isExpired,
  isRateLimited,
  normalizeEmail,
  type ConsumerRequestKind,
} from './consumer-requests'
import { LEGAL_OWNER, LEGAL_PATHS, REQUEST_CONFIRM_HOURS, WITHDRAWAL_BUSINESS_DAYS } from './owner'
import { notifyOwner, sendRequestDone, sendRequestReceived } from './request-emails'

/**
 * Las solicitudes de los botones de arrepentimiento y de baja, del lado del
 * servidor. Corren sin sesión y con `service_role`: **la única prueba de que
 * quien pide es el dueño de la cuenta es el token que llegó a su mail**.
 */

const HOUR_MS = 60 * 60 * 1000

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.gestorlumus.site').replace(/\/$/, '')
}

interface SubmitInput {
  kind: ConsumerRequestKind
  email: string
  reason: string | null
}

/**
 * Registra la solicitud y devuelve su código. **Siempre** da un código, haya o
 * no una cuenta con ese mail: la respuesta es la misma en los dos casos para no
 * revelar quién tiene cuenta en Lumus. El mail con el link solo se manda si la
 * cuenta existe, para no usar el formulario de spam hacia terceros.
 */
export async function submitConsumerRequest(input: SubmitInput): Promise<{ code: string }> {
  const service = createServiceClient()
  const email = normalizeEmail(input.email)
  const now = new Date()

  const { data: recent, error: recentError } = await service
    .from('consumer_requests')
    .select('code')
    .eq('email', email)
    .eq('kind', input.kind)
    .gte('created_at', new Date(now.getTime() - HOUR_MS).toISOString())
    .order('created_at', { ascending: false })

  if (recentError) throw new Error(`solicitudes recientes: ${recentError.message}`)
  // En ráfaga, se repite el último código en vez de crear otro y mandar otro mail.
  if (recent && recent.length > 0 && isRateLimited(recent.length)) return { code: recent[0].code }

  const { data: userId, error: userError } = await service.rpc('find_user_id_by_email', { p_email: email })
  if (userError) throw new Error(`buscar cuenta: ${userError.message}`)

  const token = userId ? generateConfirmToken() : null

  // Un choque de códigos es casi imposible, pero la base lo rechazaría: se reintenta.
  let code = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    code = generateRequestCode(input.kind)
    const { error } = await service.from('consumer_requests').insert({
      code,
      kind: input.kind,
      email,
      user_id: userId,
      reason: input.reason,
      status: userId ? 'recibida' : 'sin_cuenta',
      confirm_token_hash: token ? hashConfirmToken(token) : null,
      confirm_expires_at: token ? new Date(now.getTime() + REQUEST_CONFIRM_HOURS * HOUR_MS).toISOString() : null,
    })
    if (!error) break
    if (error.code !== '23505' || attempt === 2) throw new Error(`guardar solicitud: ${error.message}`)
  }

  if (token) {
    await sendRequestReceived(email, input.kind, code, `${appUrl()}${LEGAL_PATHS.confirm}?token=${encodeURIComponent(token)}`)
  }

  await notifyOwner({
    event: 'recibida',
    kind: input.kind,
    code,
    email,
    hasAccount: Boolean(userId),
    reason: input.reason,
    detail: userId
      ? 'Se le mandó el link de confirmación. Si confirma, la baja se hace sola y te llega otro mail.'
      : 'No hay cuenta con ese mail: no se mandó nada. Si es un error de tipeo, contestale.',
  })

  return { code }
}

export type ConfirmResult =
  | { status: 'done'; kind: ConsumerRequestKind; code: string; outcome: string }
  | { status: 'already'; code: string }
  | { status: 'expired'; code: string }
  | { status: 'invalid' }

const OUTCOME = {
  bajaCancelled:
    'Cancelamos tu suscripción: no se van a hacer más cobros. Conservás el acceso hasta el final del período que ya pagaste.',
  withdrawalCancelled:
    'Cancelamos tu suscripción y vamos a reintegrarte lo que se te haya cobrado, por el mismo medio de pago. Te escribimos cuando esté hecho.',
  nothingToCancel:
    `No tenías una suscripción activa, así que no había cobros para frenar. Tu cuenta y tus datos siguen guardados: si querés que los borremos, escribinos a ${LEGAL_OWNER.email}.`,
} as const

/** Lee el token sin ejecutar nada. La página lo usa para no mostrar un botón que va a fallar. */
export async function peekConsumerRequest(token: string): Promise<ConfirmResult | { status: 'pending'; kind: ConsumerRequestKind; code: string }> {
  const service = createServiceClient()
  const { data: row } = await service
    .from('consumer_requests')
    .select('code, kind, status, confirm_expires_at, user_id')
    .eq('confirm_token_hash', hashConfirmToken(token))
    .maybeSingle()

  if (!row || !row.user_id) return { status: 'invalid' }
  if (row.status !== 'recibida') return { status: 'already', code: row.code }
  if (isExpired(row.confirm_expires_at, new Date())) return { status: 'expired', code: row.code }
  return { status: 'pending', kind: row.kind as ConsumerRequestKind, code: row.code }
}

/** Ejecuta la solicitud. Una sola vez: el primer paso es reclamarla. */
export async function confirmConsumerRequest(token: string): Promise<ConfirmResult> {
  const service = createServiceClient()
  const now = new Date()
  const tokenHash = hashConfirmToken(token)

  const { data: row, error: readError } = await service
    .from('consumer_requests')
    .select('id, code, kind, email, reason, status, confirm_expires_at, user_id')
    .eq('confirm_token_hash', tokenHash)
    .maybeSingle()

  if (readError) throw new Error(`leer solicitud: ${readError.message}`)
  if (!row || !row.user_id) return { status: 'invalid' }
  if (row.status !== 'recibida') return { status: 'already', code: row.code }
  if (isExpired(row.confirm_expires_at, now)) return { status: 'expired', code: row.code }

  const kind = row.kind as ConsumerRequestKind

  // Reclamarla antes de tocar Mercado Pago: dos clics seguidos no cancelan dos veces.
  const { data: claimed, error: claimError } = await service
    .from('consumer_requests')
    .update({ status: 'confirmada', confirmed_at: now.toISOString() })
    .eq('id', row.id)
    .eq('status', 'recibida')
    .select('id')

  if (claimError) throw new Error(`reclamar solicitud: ${claimError.message}`)
  if (!claimed || claimed.length === 0) return { status: 'already', code: row.code }

  const { data: subscription } = await service
    .from('billing_subscriptions')
    .select('created_at')
    .eq('user_id', row.user_id)
    .maybeSingle()

  const result = await cancelSubscriptionFor(service, row.user_id)

  if (result.kind === 'error') {
    // Se devuelve a "recibida" para que pueda reintentar con el mismo link.
    await service.from('consumer_requests').update({ status: 'recibida', confirmed_at: null }).eq('id', row.id)
    throw new Error(result.message)
  }

  const outcome = result.kind === 'nothing_to_cancel'
    ? OUTCOME.nothingToCancel
    : kind === 'arrepentimiento' ? OUTCOME.withdrawalCancelled : OUTCOME.bajaCancelled

  await service
    .from('consumer_requests')
    // El hash queda: reabrir el link muestra "ya se confirmó" en vez de "no
    // sirve". No se puede ejecutar dos veces porque el estado ya no es "recibida".
    .update({ outcome })
    .eq('id', row.id)

  let detail = result.kind === 'cancelled'
    ? `Suscripción cancelada en Mercado Pago (${result.status}).`
    : 'No tenía suscripción activa: no hubo nada que cancelar.'

  if (kind === 'arrepentimiento' && result.kind === 'cancelled') {
    const days = subscription?.created_at ? businessDaysBetween(new Date(subscription.created_at), now) : null
    const window = days === null
      ? 'No se pudo calcular el plazo.'
      : `Pasaron ~${days} días hábiles desde la suscripción (plazo: ${WITHDRAWAL_BUSINESS_DAYS}, sin contar feriados).`
    detail += ` ${window} REINTEGRAR lo cobrado desde Mercado Pago y avisarle.`
  }

  await sendRequestDone(row.email, kind, row.code, outcome)
  await notifyOwner({
    event: 'confirmada',
    kind,
    code: row.code,
    email: row.email,
    hasAccount: true,
    reason: row.reason,
    detail,
  })

  return { status: 'done', kind, code: row.code, outcome }
}
