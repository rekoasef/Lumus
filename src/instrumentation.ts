import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Hook de Next 15+: es lo que hace que un error tirado dentro de una API route
// o un Server Component llegue a Sentry en vez de morir en el log de Vercel.
export const onRequestError = Sentry.captureRequestError
