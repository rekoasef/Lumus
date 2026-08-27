import type { MetadataRoute } from 'next'

/**
 * Manifest de la PWA.
 *
 * Los gastos se cargan parado en la caja, no a la noche sentado en la compu.
 * Cada paso entre "gasté" y "quedó registrado" es una transacción que no se
 * carga nunca, y Lumus depende de carga 100% manual — así que la app tiene que
 * estar en la pantalla de inicio, no en una pestaña.
 *
 * Sin service worker a propósito: no hay modo offline en este ticket, y un
 * service worker mal configurado sirve una versión vieja de la app después de
 * un deploy. El manifest solo ya da instalabilidad.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumus — Gestora de gastos',
    short_name: 'Lumus',
    description: 'Gastos, ingresos, presupuestos, pagos fijos y metas de ahorro, en un solo lugar.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0f',
    theme_color: '#0a0a0f',
    lang: 'es-AR',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // El maskable es el que Android recorta con la forma del launcher.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Cargar gasto',
        short_name: 'Gasto',
        description: 'Abre el formulario de gasto listo para escribir el monto.',
        url: '/finanzas?seccion=transacciones&nuevo=gasto',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  }
}
