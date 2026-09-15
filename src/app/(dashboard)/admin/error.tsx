'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * Si las métricas no cargan, se dice. Lo que no puede pasar es mostrar ceros:
 * un panel en cero dice "nadie usa Lumus", la conclusión más cara de sacar por
 * error.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen px-3 py-5 sm:px-5 sm:py-8 lg:px-12 lg:py-12">
      <div className="lumus-glass mx-auto max-w-lg rounded-3xl p-6 text-center sm:p-8">
        <p className="lumus-label text-[0.6rem] text-[var(--danger)]">Panel de admin</p>
        <h1 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">No se pudieron cargar las métricas</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Los datos no se muestran incompletos a propósito. Probá de nuevo; si sigue fallando, el detalle quedó en Sentry.
        </p>
        <button
          onClick={reset}
          className="mt-5 rounded-lg bg-[var(--accent-lumus)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
