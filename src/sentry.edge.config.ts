// Init de Sentry para el runtime edge — donde corre `proxy.ts`, el gate de
// auth/onboarding/billing. Misma configuración que el server.
import * as Sentry from '@sentry/nextjs'
import { sharedSentryOptions } from '@/lib/observability/sentry'

Sentry.init({ ...sharedSentryOptions })
