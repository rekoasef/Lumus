import type { FeedbackKind } from '@/types'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

// Mismo remitente que ya usa Supabase Auth: el dominio está verificado en
// Resend, así que no hace falta configurar nada nuevo.
const FROM = 'Lumus <no-reply@gestorlumus.site>'

const SQL_EDITOR_URL = 'https://supabase.com/dashboard/project/ccixixskklovvvikiwbq/sql/new'

const KIND_STYLE: Record<FeedbackKind, { label: string; color: string; bg: string }> = {
  bug:    { label: 'BUG',    color: '#fca5a5', bg: 'rgba(239,68,68,0.14)' },
  mejora: { label: 'MEJORA', color: '#fcd34d', bg: 'rgba(245,158,11,0.14)' },
  otro:   { label: 'OTRO',   color: '#c4b5fd', bg: 'rgba(124,109,250,0.16)' },
}

export interface FeedbackNotification {
  id: string
  kind: FeedbackKind
  message: string
  path: string | null
  userAgent: string | null
  userEmail: string
  createdAt: string
}

/** El mensaje lo escribe el usuario: nunca va crudo al HTML del mail. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 0;color:#6b6b7b;font-size:12px;width:96px;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;color:#c9c9d4;font-size:13px;">${escapeHtml(value)}</td>
    </tr>`
}

function buildHtml(n: FeedbackNotification): string {
  const kind = KIND_STYLE[n.kind]

  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#08080c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080c;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111118;border:1px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

        <tr><td style="padding:22px 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="font-size:13px;font-weight:700;letter-spacing:2px;color:#ffffff;">
                <span style="color:#7c6dfa;">&#9679;</span>&nbsp; LUMUS
              </td>
              <td align="right">
                <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${kind.bg};color:${kind.color};font-size:10px;font-weight:700;letter-spacing:1px;">${kind.label}</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:18px 24px 0;">
          <p style="margin:0;font-size:17px;font-weight:600;color:#ffffff;">Nuevo feedback</p>
          <p style="margin:5px 0 0;font-size:13px;color:#6b6b7b;">Alguien reportó algo desde la app.</p>
        </td></tr>

        <tr><td style="padding:18px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:rgba(255,255,255,0.03);border-left:3px solid #7c6dfa;border-radius:0 10px 10px 0;">
            <tr><td style="padding:14px 16px;color:#e8e8ef;font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(n.message)}</td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:18px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row('Usuario', n.userEmail)}
            ${row('Pantalla', n.path ?? 'sin registrar')}
            ${row('Fecha', formatDate(n.createdAt))}
            ${n.userAgent ? row('Dispositivo', n.userAgent) : ''}
          </table>
        </td></tr>

        <tr><td style="padding:20px 24px 24px;">
          <a href="${SQL_EDITOR_URL}"
             style="display:inline-block;padding:10px 18px;border-radius:10px;background:#7c6dfa;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;">
            Ver todos los reportes
          </a>
          <p style="margin:14px 0 0;font-size:11px;line-height:1.6;color:#4d4d5c;">
            Para marcarlo como resuelto:<br>
            <code style="color:#6b6b7b;">update feedback set status = 'resuelto' where id = '${n.id}';</code>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Avisa por mail que entró un reporte nuevo.
 *
 * Devuelve un booleano en vez de tirar: el reporte del usuario ya se guardó,
 * y que falle el mail no puede hacer que él vea un error ni que reintente y
 * duplique el reporte.
 */
export async function sendFeedbackNotification(n: FeedbackNotification): Promise<boolean> {
  const to = process.env.FEEDBACK_NOTIFICATION_EMAIL
  const apiKey = process.env.RESEND_API_KEY

  if (!to || !apiKey) {
    console.warn('[feedback] sin FEEDBACK_NOTIFICATION_EMAIL o RESEND_API_KEY, no se notifica')
    return false
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: n.userEmail,
        subject: `[Lumus] ${KIND_STYLE[n.kind].label} de ${n.userEmail}`,
        html: buildHtml(n),
      }),
    })

    if (!res.ok) {
      console.error('[feedback] Resend respondió', res.status, await res.text())
      return false
    }
    return true
  } catch (error) {
    console.error('[feedback] no se pudo notificar por mail', error)
    return false
  }
}
