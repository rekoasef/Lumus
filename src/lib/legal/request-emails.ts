import { LEGAL_OWNER, REQUEST_CONFIRM_HOURS } from './owner'
import type { ConsumerRequestKind } from './consumer-requests'

/**
 * Los mails de los botones de arrepentimiento y de baja.
 *
 * Son la excepción a "todo aviso sale por el digest diario": la norma pide
 * contestar con el código dentro de las 24 horas, y el digest puede tardar
 * más. Son uno por solicitud y los dispara la persona, no un cron.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const FROM = 'Lumus <no-reply@gestorlumus.site>'

const KIND_LABEL: Record<ConsumerRequestKind, string> = {
  arrepentimiento: 'arrepentimiento',
  baja: 'baja del servicio',
}

// En claro, como el resto de los mails de Lumus (ver `lib/feedback/notify-email`).
const C = {
  page: '#f2f2f6',
  card: '#ffffff',
  border: '#e4e4ed',
  text: '#16151c',
  secondary: '#55545f',
  muted: '#7b7a88',
  accent: '#7c6dfa',
  codeBg: '#f4f4f8',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Los textos llegan ya escapados o son nuestros; `body` admite HTML armado acá. */
function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<head><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:${C.page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.card};border:1px solid ${C.border};border-radius:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr><td style="padding:22px 24px 0;font-size:13px;font-weight:700;letter-spacing:2px;color:${C.text};">
          <span style="color:${C.accent};">&#9679;</span>&nbsp; LUMUS
        </td></tr>
        <tr><td style="padding:18px 24px 0;">
          <p style="margin:0;font-size:18px;font-weight:600;color:${C.text};">${title}</p>
        </td></tr>
        <tr><td style="padding:14px 24px 0;font-size:14px;line-height:1.6;color:${C.secondary};">${body}</td></tr>
        <tr><td style="padding:22px 24px 24px;font-size:11px;line-height:1.5;color:${C.muted};border-top:1px solid ${C.border};">
          ${escapeHtml(LEGAL_OWNER.name)} · CUIT ${LEGAL_OWNER.cuit} · ${escapeHtml(LEGAL_OWNER.address)}<br>
          Consultas: <a href="mailto:${LEGAL_OWNER.email}" style="color:${C.accent};">${LEGAL_OWNER.email}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function codeBlock(code: string): string {
  return `<p style="margin:16px 0;padding:12px 16px;background:${C.codeBg};border-radius:10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:2px;color:${C.text};text-align:center;">${escapeHtml(code)}</p>`
}

async function send(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[solicitudes] sin RESEND_API_KEY, no se manda el mail')
    return false
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    })
    if (!res.ok) {
      console.error('[solicitudes] Resend respondió', res.status, await res.text())
      return false
    }
    return true
  } catch (error) {
    console.error('[solicitudes] no se pudo mandar el mail', error)
    return false
  }
}

/** El acuse: el código y el link para confirmar. */
export function sendRequestReceived(to: string, kind: ConsumerRequestKind, code: string, confirmUrl: string) {
  const label = KIND_LABEL[kind]
  const body = `
    <p style="margin:0;">Recibimos tu solicitud de ${label}. Este es su código de identificación:</p>
    ${codeBlock(code)}
    <p style="margin:0;">Para que nadie pueda hacerla en tu nombre, confirmala desde este botón. El link vence en ${REQUEST_CONFIRM_HOURS} horas.</p>
    <p style="margin:20px 0 0;"><a href="${confirmUrl}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:${C.accent};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Confirmar la ${label}</a></p>
    <p style="margin:18px 0 0;font-size:12px;color:${C.muted};">Si no la pediste vos, ignorá este mail: no se va a hacer nada.</p>`
  return send(to, `Tu solicitud de ${label} — código ${code}`, layout(`Solicitud de ${label} recibida`, body))
}

/** La constancia de que se hizo. */
export function sendRequestDone(to: string, kind: ConsumerRequestKind, code: string, outcome: string) {
  const label = KIND_LABEL[kind]
  const body = `
    <p style="margin:0;">Confirmaste tu solicitud de ${label}.</p>
    ${codeBlock(code)}
    <p style="margin:0;">${escapeHtml(outcome)}</p>
    <p style="margin:14px 0 0;">Si tenés alguna duda, respondé este mail citando el código.</p>`
  return send(to, `Solicitud de ${label} confirmada — código ${code}`, layout(`Tu ${label} está hecha`, body), LEGAL_OWNER.email)
}

export interface OwnerRequestNotice {
  event: 'recibida' | 'confirmada'
  kind: ConsumerRequestKind
  code: string
  email: string
  hasAccount: boolean
  reason: string | null
  /** Lo que hizo el sistema, o lo que tiene que hacer una persona. */
  detail: string
}

/** Al dueño: cada solicitud y cada confirmación, para responder o reintegrar a tiempo. */
export function notifyOwner(n: OwnerRequestNotice) {
  const to = process.env.FEEDBACK_NOTIFICATION_EMAIL
  if (!to) {
    console.warn('[solicitudes] sin FEEDBACK_NOTIFICATION_EMAIL, no se avisa al dueño')
    return Promise.resolve(false)
  }

  const label = KIND_LABEL[n.kind]
  const rows = [
    ['Código', n.code],
    ['Mail', n.email],
    ['Cuenta', n.hasAccount ? 'Sí' : 'No hay cuenta con ese mail'],
    ['Motivo', n.reason ?? '—'],
    ['Detalle', n.detail],
  ]
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:${C.muted};font-size:12px;width:90px;vertical-align:top;">${k}</td><td style="padding:6px 0;font-size:13px;">${escapeHtml(v)}</td></tr>`)
    .join('')

  const body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
  return send(to, `[Lumus] ${label} ${n.event} — ${n.code}`, layout(`Solicitud de ${label} ${n.event}`, body), n.email)
}
