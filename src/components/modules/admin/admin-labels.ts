import type { AccessKind } from '@/lib/billing/access'
import type { EngagementLevel } from '@/types/admin.types'

export const ENGAGEMENT_LABELS: Record<EngagementLevel, { label: string; color: string }> = {
  activo:   { label: 'Activo',    color: 'var(--success)' },
  tibio:    { label: 'Tibio',     color: 'var(--warning)' },
  inactivo: { label: 'Inactivo',  color: 'var(--danger)' },
  nunca:    { label: 'Sin entrar', color: 'var(--text-muted)' },
}

export const ACCESS_LABELS: Record<AccessKind, string> = {
  subscription: 'Pagando',
  free_grant: 'Cortesía',
  none: 'Bloqueado',
}

export const FEEDBACK_KIND_LABELS: Record<string, string> = {
  bug: 'Bug',
  mejora: 'Mejora',
  otro: 'Otro',
}
