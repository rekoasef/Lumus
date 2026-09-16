/**
 * El esqueleto de cualquier pantalla del dashboard mientras el server responde.
 *
 * Es deliberadamente neutro —encabezado, unas tarjetas, una lista— porque lo
 * comparten pantallas distintas: acierta la forma general sin prometer un
 * contenido que después no aparece. Sin esto, al navegar quedaba la pantalla
 * anterior congelada, que se lee como que el toque no funcionó.
 *
 * `/admin` tiene el suyo, más parecido a lo que muestra.
 */

function Block({ className }: { className: string }) {
  return <div className={`lumus-glass animate-pulse ${className}`} />
}

export default function DashboardLoading() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-[1120px] space-y-5 sm:space-y-6">
        {/* Encabezado: etiqueta corta y título */}
        <div className="space-y-2.5">
          <div className="h-2.5 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-7 w-56 max-w-full animate-pulse rounded-lg bg-white/[0.06]" />
        </div>

        {/* Las tarjetas de resumen que casi todas las pantallas tienen arriba */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {[0, 1, 2].map(i => (
            <Block key={i} className="h-24 rounded-2xl" />
          ))}
        </div>

        {/* El bloque principal: lista, gráfico o detalle */}
        <Block className="h-72 rounded-3xl" />
      </div>
    </div>
  )
}
