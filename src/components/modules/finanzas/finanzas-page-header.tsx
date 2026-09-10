/**
 * Encabezado de las pantallas de finanzas que no son Movimientos.
 *
 * Las cuatro cards de totales del mes viven **solo** en Movimientos: ponerlas
 * acá obligaría a cada página a traer billeteras y el agregado del mes, que es
 * exactamente el peso del que este ticket vino a sacar al camino diario.
 */
export function FinanzasPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-8">
      <div>
        <h1 className="lumus-heading text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      {action}
    </header>
  )
}

/** Contenedor común: mismo ancho y mismos márgenes en todas las pantallas de finanzas. */
export function FinanzasPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 sm:py-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[1120px]">{children}</div>
    </div>
  )
}
