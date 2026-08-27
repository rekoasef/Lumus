// Init de Sentry en el browser. Next lo carga solo, antes de hidratar.
import * as Sentry from '@sentry/nextjs'
import { sharedSentryOptions } from '@/lib/observability/sentry'

// A propósito sin `replayIntegration` ni `feedbackIntegration`: el replay graba
// la pantalla del usuario, o sea todo su detalle financiero, y para reportar
// bugs la app ya tiene su propio botón de feedback.
Sentry.init({ ...sharedSentryOptions })

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
