import type { Notification } from '@/types/notifications.types'
import { createUnsubscribeToken } from './unsubscribe-token'

/**
 * El mail del digest diario: uno por usuario por día, con todo junto.
 *
 * Nunca un mail por evento. Tres vencimientos el mismo día son tres líneas de
 * un mail, no tres mails — es la diferencia entre un aviso útil y algo que se
 * manda a spam.
 *
 * Se diseña en claro, no en oscuro: Gmail fuerza los mails oscuros a tema
 * claro y los grises pensados para fondo negro quedan ilegibles sobre blanco.
 * Pasó exactamente eso con el mail de feedback en la ronda 1.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const FROM = 'Lumus <no-reply@gestorlumus.site>'

const C = {
  page:      '#f2f2f6',
  card:      '#ffffff',
  border:    '#e4e4ed',
  text:      '#16151c',
  secondary: '#55545f',
  muted:     '#7b7a88',
  accent:    '#7c6dfa',
  rowBg:     '#f7f6ff',
  dangerBg:  '#fdecea',
  dangerFg:  '#b42318',
  warnBg:    '#fff5e5',
  warnFg:    '#a15c00',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.gestorlumus.site'
}

/** El título del aviso ya viene armado por quien lo generó. */
function noticeRow(notification: Notification): string {
  // La fase sale del `dedupe_key`, que la lleva por diseño. Deducirla del
  // texto del cuerpo funcionaría hasta que alguien reescriba una frase.
  const overdue = notification.dedupe_key.endsWith(':vencido')
  const chipBg = overdue ? C.dangerBg : C.warnBg
  const chipFg = overdue ? C.dangerFg : C.warnFg
  const chip = overdue ? 'VENCIDO' : 'POR VENCER'

  return `
    <tr><td style="padding:0 0 10px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.rowBg};border-radius:10px;">
        <tr><td style="padding:13px 15px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:14px;font-weight:600;color:${C.text};">${escapeHtml(notification.title)}</td>
              <td align="right">
                <span style="display:inline-block;padding:3px 9px;border-radius:999px;background:${chipBg};color:${chipFg};font-size:10px;font-weight:700;letter-spacing:0.5px;">${chip}</span>
              </td>
            </tr>
          </table>
          ${notification.body ? `<p style="margin:5px 0 0;font-size:13px;color:${C.secondary};">${escapeHtml(notification.body)}</p>` : ''}
        </td></tr>
      </table>
    </td></tr>`
}

export function buildDigestHtml(notifications: readonly Notification[], userId: string): string {
  const base = appUrl()
  const unsubscribeUrl = `${base}/baja?token=${encodeURIComponent(createUnsubscribeToken(userId))}`
  const count = notifications.length
  const subtitle = count === 1
    ? 'Tenés un vencimiento para mirar.'
    : `Tenés ${count} vencimientos para mirar.`

  return `<!doctype html>
<html lang="es">
<head><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:${C.page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.card};border:1px solid ${C.border};border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

        <tr><td style="padding:22px 24px 0;font-size:13px;font-weight:700;letter-spacing:2px;color:${C.text};">
          <span style="color:${C.accent};">&#9679;</span>&nbsp; LUMUS
        </td></tr>

        <tr><td style="padding:18px 24px 0;">
          <p style="margin:0;font-size:18px;font-weight:600;color:${C.text};">Vencimientos</p>
          <p style="margin:5px 0 0;font-size:13px;color:${C.secondary};">${subtitle}</p>
        </td></tr>

        <tr><td style="padding:18px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${notifications.map(noticeRow).join('')}
          </table>
        </td></tr>

        <tr><td style="padding:6px 24px 0;">
          <a href="${base}/finanzas"
             style="display:inline-block;padding:11px 20px;border-radius:10px;background:${C.accent};color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;">
            Ver en Lumus
          </a>
        </td></tr>

        <tr><td style="padding:20px 24px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.border};">
            <tr><td style="padding-top:14px;">
              <p style="margin:0;font-size:11px;color:${C.muted};line-height:1.6;">
                Recibís este mail porque tenés vencimientos cargados en Lumus.
                <a href="${unsubscribeUrl}" style="color:${C.muted};text-decoration:underline;">Dejar de recibirlos</a>.
              </p>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** Versión en texto plano, para los clientes que no muestran HTML. */
export function buildDigestText(notifications: readonly Notification[], userId: string): string {
  const base = appUrl()
  const lines = notifications.map(n => `- ${n.title}${n.body ? ` — ${n.body}` : ''}`)
  return [
    'Vencimientos en Lumus',
    '',
    ...lines,
    '',
    `Ver en Lumus: ${base}/finanzas`,
    `Dejar de recibir estos avisos: ${base}/baja?token=${encodeURIComponent(createUnsubscribeToken(userId))}`,
  ].join('\n')
}

/**
 * Manda el digest. Devuelve si salió, sin tirar.
 *
 * Que falle el mail de un usuario no puede cortar la corrida del cron para el
 * resto: los avisos ya están guardados y, al no marcarse `emailed_at`, entran
 * en el digest de mañana.
 */
export async function sendDigestEmail(
  to: string,
  userId: string,
  notifications: readonly Notification[],
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[avisos] sin RESEND_API_KEY, no se manda el digest')
    return false
  }
  if (notifications.length === 0) return false

  const subject = notifications.length === 1
    ? `Lumus — ${notifications[0].title}`
    : `Lumus — ${notifications.length} vencimientos`

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject,
        html: buildDigestHtml(notifications, userId),
        text: buildDigestText(notifications, userId),
      }),
    })

    if (!res.ok) {
      console.error('[avisos] Resend respondió', res.status, await res.text())
      return false
    }

    return true
  } catch (error) {
    console.error('[avisos] no se pudo mandar el digest', error)
    return false
  }
}
