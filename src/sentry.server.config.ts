// Init de Sentry para el runtime de Node — lo carga `instrumentation.ts`.
// La configuración (y el scrubbing de datos sensibles) vive en un solo lugar:
// src/lib/observability/sentry.ts
import * as Sentry from '@sentry/nextjs'
import { sharedSentryOptions } from '@/lib/observability/sentry'

Sentry.init({ ...sharedSentryOptions })
