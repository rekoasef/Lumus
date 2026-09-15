'use client'

import { toast } from 'sonner'
import { useAdminActions } from '@/hooks/use-admin-actions'
import type { FeedbackStatusInput } from '@/lib/validations/admin'

type Status = FeedbackStatusInput['status']

/** Qué se puede hacer desde cada estado. */
const NEXT_STEPS: Record<Status, { to: Status; label: string }[]> = {
  nuevo: [{ to: 'visto', label: 'Visto' }, { to: 'resuelto', label: 'Resuelto' }],
  visto: [{ to: 'resuelto', label: 'Resuelto' }],
  resuelto: [{ to: 'visto', label: 'Reabrir' }],
}

function isStatus(value: string): value is Status {
  return value === 'nuevo' || value === 'visto' || value === 'resuelto'
}

export function AdminFeedbackActions({ id, status }: { id: string; status: string }) {
  const { pending, setFeedbackStatus } = useAdminActions()
  if (!isStatus(status)) return null

  async function handle(to: Status) {
    try {
      await setFeedbackStatus(id, { status: to })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar')
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {NEXT_STEPS[status].map(step => (
        <button
          key={step.to}
          type="button"
          disabled={pending === `feedback:${id}`}
          onClick={() => void handle(step.to)}
          className={`rounded-md border px-2 py-1 text-[0.62rem] font-medium transition-colors disabled:opacity-50 ${
            step.to === 'resuelto'
              ? 'border-[var(--success)]/30 text-[var(--success)] hover:bg-[var(--success-muted)]'
              : 'border-white/10 text-[var(--text-secondary)] hover:border-white/20'
          }`}
        >
          {step.label}
        </button>
      ))}
    </div>
  )
}
