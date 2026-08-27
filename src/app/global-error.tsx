'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import './globals.css'

const LABELS = {
  title: 'Algo se rompió',
  description: 'El error ya nos llegó y lo estamos mirando. Podés reintentar o volver al inicio.',
  retry: 'Reintentar',
  home: 'Ir al inicio',
} as const

/**
 * Último recinto de contención: entra cuando falla el layout raíz, así que
 * reemplaza al `<html>` de la app entera. Por eso importa `globals.css` y
 * repite los tokens a mano — acá no hay layout que los aporte.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <div
            aria-hidden
            className="h-16 w-16 rounded-full bg-[radial-gradient(circle_at_30%_25%,#bdb4ff,transparent_62%)] opacity-70 blur-[2px]"
          />

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{LABELS.title}</h1>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
              {LABELS.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={reset}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
            >
              {LABELS.retry}
            </button>
            {/* Navegación dura a propósito: si se rompió el layout raíz, un
                soft nav de next/link remonta justo lo que acaba de fallar. */}
            <button
              onClick={() => { window.location.href = '/' }}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              {LABELS.home}
            </button>
          </div>

          {error.digest ? (
            <p className="font-mono text-xs text-[var(--text-muted)]">{error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  )
}
