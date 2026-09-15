import type { Json } from '@/types/database.types'

/**
 * Cómo se lee una entrada de `admin_actions` en el panel.
 *
 * `details` es jsonb, escrito por las funciones de 00031. Se lee campo por campo
 * y con el tipo verificado en vez de castearlo: si una entrada vieja o rara no
 * trae lo esperado, la línea sale más corta, no rompe la página.
 */

function field(details: Json, key: string): Json | undefined {
  if (details === null || typeof details !== 'object' || Array.isArray(details)) return undefined
  return details[key]
}

function text(details: Json, key: string): string | null {
  const value = field(details, key)
  return typeof value === 'string' ? value : null
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function expiryLabel(iso: string | null): string {
  return iso ? `hasta el ${formatShortDate(iso)}` : 'sin vencimiento'
}

export function describeAdminAction(action: string, targetEmail: string | null, details: Json): string {
  const who = targetEmail ?? 'un usuario'

  switch (action) {
    case 'invite': {
      const days = field(details, 'access_days')
      const duration = typeof days === 'number' ? `${days} días` : 'sin vencimiento'
      return `Invitó a ${who} (${duration})`
    }
    case 'cancel_invite':
      return `Canceló la invitación de ${who}`
    case 'set_grant': {
      const expires = expiryLabel(text(details, 'expires_at'))
      const hadGrant = field(details, 'had_grant') === true
      const viaInvite = text(details, 'via') === 'invite_existing_account'
      if (hadGrant) {
        const previous = expiryLabel(text(details, 'previous_expires_at'))
        return `Cambió la cortesía de ${who}: ${previous} → ${expires}`
      }
      return `Dio cortesía a ${who}, ${expires}${viaInvite ? ' (ya tenía cuenta)' : ''}`
    }
    case 'revoke_grant':
      return `Revocó la cortesía de ${who}`
    case 'set_feedback_status': {
      const to = text(details, 'to')
      return to ? `Marcó un feedback como ${to}` : 'Cambió el estado de un feedback'
    }
    default:
      return action
  }
}
