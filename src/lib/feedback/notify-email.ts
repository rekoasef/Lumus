import type { FeedbackKind } from '@/types'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

// Mismo remitente que ya usa Supabase Auth: el dominio está verificado en
// Resend, así que no hace falta configurar nada nuevo.
const FROM = 'Lumus <no-reply@gestorlumus.site>'

const SQL_EDITOR_URL = 'https://supabase.com/dashboard/project/ccixixskklovvvikiwbq/sql/new'

// El mail se diseña en claro, no en oscuro: Gmail fuerza los mails oscuros a
// tema claro y los grises pensados para fondo negro quedan ilegibles sobre
// blanco. En claro, los clientes con tema oscuro invierten de forma prolija.
const KIND_STYLE: Record<FeedbackKind, { label: string; color: string; bg: string }> = {
  bug:    { label: 'BUG',    color: '#b42318', bg: '#fdecea' },
  mejora: { label: 'MEJORA', color: '#a15c00', bg: '#fff5e5' },
  otro:   { label: 'OTRO',   color: '#5b45d6', bg: '#efecff' },
}

const C = {
  page:      '#f2f2f6',
  card:      '#ffffff',
  border:    '#e4e4ed',
  text:      '#16151c',
  secondary: '#55545f',
  muted:     '#7b7a88',
  accent:    '#7c6dfa',
  quoteBg:   '#f7f6ff',
  codeBg:    '#f4f4f8',
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
      <td style="padding:7px 0;color:${C.muted};font-size:12px;width:100px;vertical-align:top;">${label}</td>
      <td style="padding:7px 0;color:${C.secondary};font-size:13px;line-height:1.5;">${escapeHtml(value)}</td>
    </tr>`
}

function buildHtml(n: FeedbackNotification): string {
  const kind = KIND_STYLE[n.kind]

  return `<!doctype html>
<html lang="es">
<head><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:${C.page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.card};border:1px solid ${C.border};border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

        <tr><td style="padding:22px 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="font-size:13px;font-weight:700;letter-spacing:2px;color:${C.text};">
                <span style="color:${C.accent};">&#9679;</span>&nbsp; LUMUS
              </td>
              <td align="right">
                <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${kind.bg};color:${kind.color};font-size:10px;font-weight:700;letter-spacing:1px;">${kind.label}</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:18px 24px 0;">
          <p style="margin:0;font-size:18px;font-weight:600;color:${C.text};">Nuevo feedback</p>
          <p style="margin:5px 0 0;font-size:13px;color:${C.secondary};">${escapeHtml(n.userEmail)} reportó algo desde la app.</p>
        </td></tr>

        <tr><td style="padding:18px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:${C.quoteBg};border-left:3px solid ${C.accent};border-radius:0 10px 10px 0;">
            <tr><td style="padding:14px 16px;color:${C.text};font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(n.message)}</td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:16px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row('Pantalla', n.path ?? 'sin registrar')}
            ${row('Fecha', formatDate(n.createdAt))}
            ${n.userAgent ? row('Dispositivo', n.userAgent) : ''}
          </table>
        </td></tr>

        <tr><td style="padding:20px 24px 0;">
          <a href="${SQL_EDITOR_URL}"
             style="display:inline-block;padding:11px 20px;border-radius:10px;background:${C.accent};color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;">
            Ver todos los reportes
          </a>
        </td></tr>

        <tr><td style="padding:18px 24px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.border};">
            <tr><td style="padding-top:14px;">
              <p style="margin:0 0 6px;font-size:11px;color:${C.muted};">Para marcarlo como resuelto:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.codeBg};border-radius:8px;">
                <tr><td style="padding:10px 12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:${C.secondary};word-break:break-all;">update feedback set status = 'resuelto' where id = '${n.id}';</td></tr>
              </table>
              <p style="margin:12px 0 0;font-size:11px;color:${C.muted};">Respondiendo este mail le contestás directo a quien lo reportó.</p>
            </td></tr>
          </table>
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
