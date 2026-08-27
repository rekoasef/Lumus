'use client'

import { useState } from 'react'
import { Bell, Mail, Loader2 } from 'lucide-react'
import { SectionHeading } from './section-heading'
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_INFO,
  type NotificationChannels,
  type NotificationType,
} from '@/types/notifications.types'

const LABELS = {
  title: 'Avisos',
  description: 'Elegí por dónde te avisamos cada cosa. Apagar los dos deja el aviso sin generar.',
  inApp: 'En la app',
  email: 'Por mail',
  error: 'No se pudo guardar. Probá de nuevo.',
  locked: 'Este aviso no se puede desactivar.',
} as const

type Preferences = Record<NotificationType, NotificationChannels>

function Toggle({
  checked,
  disabled,
  onChange,
  label,
  icon: Icon,
}: {
  checked: boolean
  disabled: boolean
  onChange: (value: boolean) => void
  label: string
  icon: typeof Bell
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.7rem] font-medium transition-colors disabled:opacity-40 ${
        checked
          ? 'border-[var(--accent-lumus)]/40 bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
          : 'border-white/10 bg-white/[0.02] text-[var(--text-muted)] hover:border-white/20'
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  )
}

export function NotificationPreferences({ initial }: { initial: Preferences }) {
  const [preferences, setPreferences] = useState<Preferences>(initial)
  const [saving, setSaving] = useState<NotificationType | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function update(type: NotificationType, channels: NotificationChannels) {
    const previous = preferences[type]

    // Optimista: el toggle tiene que responder al toque, no a la red.
    setPreferences(prev => ({ ...prev, [type]: channels }))
    setSaving(type)
    setError(null)

    const res = await fetch('/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, inApp: channels.inApp, email: channels.email }),
    }).catch(() => null)

    if (!res?.ok) {
      setPreferences(prev => ({ ...prev, [type]: previous }))
      setError(LABELS.error)
    }

    setSaving(null)
  }

  return (
    <section id="avisos" className="scroll-mt-24">
      <SectionHeading
        index="04"
        label={LABELS.title}
        action={saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" /> : undefined}
      />

      <p className="mt-4 text-xs leading-relaxed text-[var(--text-secondary)]">{LABELS.description}</p>

      <div className="mt-5 space-y-3">
        {NOTIFICATION_TYPES.map(type => {
          const info = NOTIFICATION_TYPE_INFO[type]
          const channels = preferences[type]

          return (
            <div
              key={type}
              className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{info.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {info.description}
                </p>
                {!info.canDisable && (
                  <p className="mt-1 text-[0.68rem] text-[var(--text-muted)]">{LABELS.locked}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Toggle
                  checked={channels.inApp}
                  disabled={!info.canDisable || saving === type}
                  onChange={value => update(type, { ...channels, inApp: value })}
                  label={LABELS.inApp}
                  icon={Bell}
                />
                <Toggle
                  checked={channels.email}
                  disabled={!info.canDisable || saving === type}
                  onChange={value => update(type, { ...channels, email: value })}
                  label={LABELS.email}
                  icon={Mail}
                />
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="mt-4 text-xs text-[var(--danger)]">{error}</p>}
    </section>
  )
}
