import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs'

/**
 * Configuración común a los tres runtimes de Sentry (cliente, server y edge).
 *
 * Lumus manda montos, descripciones de transacciones y mails en casi todos los
 * requests, así que los defaults del SDK no sirven tal cual: adjunta bodies,
 * cookies, headers, query params y las variables locales de cada frame del
 * stack. Acá se apaga todo eso con `dataCollection`, y `beforeSend` /
 * `beforeBreadcrumb` vuelven a limpiar lo que igual se cuela. Un stack trace
 * sirve igual sin el detalle financiero de nadie.
 */

/** Sin DSN el SDK queda inerte — es el caso normal en local. */
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * `NEXT_PUBLIC_VERCEL_ENV` lo inyecta Vercel solo (production / preview) y es
 * la única de las dos que existe también en el bundle del cliente.
 */
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV

/** Agrupa los errores por deploy sin necesidad de subir source maps. */
const SENTRY_RELEASE = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

/**
 * Atributos que el SDK mete dentro del selector de un breadcrumb de click.
 * Hoy ninguna label de Lumus lleva plata adentro, pero alcanza con un
 * title con la descripción de la transacción para que empiece a viajar sola.
 */
const DOM_TEXT_ATTRIBUTES = /\[(?:aria-label|title|alt|name)="[^"]*"\]/g

/** Lo único que se guarda de un breadcrumb de fetch/xhr. */
const SAFE_BREADCRUMB_DATA_KEYS = ['method', 'status_code'] as const

/** La query string lleva filtros de fecha, montos y a veces el mail. */
function stripQueryString(url: string): string {
  const cut = url.search(/[?#]/)
  return cut === -1 ? url : url.slice(0, cut)
}

/**
 * Deja el breadcrumb en su esqueleto: qué pasó y contra qué URL, sin payload.
 * Devuelve `null` para descartarlo.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  // Los `console.error` de las API routes imprimen el error de Supabase crudo,
  // que a veces trae la fila entera que se intentó insertar.
  if (breadcrumb.category === 'console') return null

  const scrubbed: Breadcrumb = { ...breadcrumb }

  if (typeof scrubbed.message === 'string') {
    scrubbed.message = scrubbed.message.replace(DOM_TEXT_ATTRIBUTES, '')
  }

  if (scrubbed.data) {
    const data: Record<string, unknown> = {}
    for (const key of SAFE_BREADCRUMB_DATA_KEYS) {
      if (key in scrubbed.data) data[key] = scrubbed.data[key]
    }
    const { url } = scrubbed.data
    if (typeof url === 'string') data.url = stripQueryString(url)
    scrubbed.data = data
  }

  return scrubbed
}

/** Última pasada antes de que el evento salga del proceso. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
    delete event.request.headers
    delete event.request.query_string
    if (typeof event.request.url === 'string') {
      event.request.url = stripQueryString(event.request.url)
    }
  }

  // Nadie llama a `setUser`, pero si alguna vez se hace que viaje solo el id.
  if (event.user) {
    event.user = typeof event.user.id === 'string' ? { id: event.user.id } : {}
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((breadcrumb): breadcrumb is Breadcrumb => breadcrumb !== null)
  }

  return event
}

export const sharedSentryOptions = {
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),
  environment: SENTRY_ENVIRONMENT,
  release: SENTRY_RELEASE,

  // Solo errores. No hay presupuesto de performance que gastar en dos usuarios,
  // y las transacciones mandan la URL completa de cada request.
  tracesSampleRate: 0,

  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
    // Las variables locales de un handler de transacciones son, literalmente,
    // el monto y la descripción.
    stackFrameVariables: false,
    databaseQueryData: false,
  },

  beforeSend(event: ErrorEvent): ErrorEvent {
    return scrubEvent(event)
  },

  beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
    return scrubBreadcrumb(breadcrumb)
  },
}
