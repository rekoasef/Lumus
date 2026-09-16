'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { RotateCw, AlertTriangle } from 'lucide-react'

/**
 * El error de cualquier pantalla del dashboard.
 *
 * Vive en el grupo y no en cada página para que el fallo se muestre **dentro**
 * del layout: con la navegación puesta, alguien puede irse a otro lado. Sin
 * esto, un error en Finanzas subía hasta `global-error`, que reemplaza el
 * documento entero y deja una pantalla sin salida.
 *
 * Lo que más importa acá es la segunda línea: en una app de plata, ver un error
 * después de cargar un gasto da miedo. Que el dato ya guardado está a salvo hay
 * que decirlo, porque es verdad y porque nadie lo asume.
 */

const COPY = {
  tag: 'Algo se rompió',
  title: 'No pudimos mostrar esta pantalla',
  body: 'Lo que ya habías guardado está a salvo: esto falló al mostrar los datos, no al guardarlos.',
  retry: 'Probar de nuevo',
  home: 'Ir al inicio',
  ref: 'Referencia',
} as const

export default function DashboardError({
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
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="lumus-glass w-full max-w-md rounded-3xl p-6 text-center sm:p-8">
        <div
          className="mx-auto flex size-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 12%, transparent)' }}
        >
          <AlertTriangle size={20} className="text-[var(--danger)]" />
        </div>

        <p className="lumus-label mt-4 text-[0.6rem] text-[var(--danger)]">{COPY.tag}</p>
        <h1 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{COPY.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{COPY.body}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <RotateCw size={14} />
            {COPY.retry}
          </button>
          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-white/20 hover:text-[var(--text-primary)]"
          >
            {COPY.home}
          </Link>
        </div>

        {/* El digest es lo único que ata lo que vio el usuario con lo que quedó
            en Sentry: si escribe para reportarlo, es el dato que sirve. */}
        {error.digest && (
          <p className="mt-5 text-[0.65rem] text-[var(--text-muted)]">
            {COPY.ref} <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
    </div>
  )
}
