import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Hanken_Grotesk } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const hankenGrotesk = Hanken_Grotesk({
  variable: '--font-hanken',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Lumus — Gestora de gastos',
  description: 'Lumus centraliza gastos, ingresos, presupuestos, pagos fijos, metas de ahorro y cotizaciones.',
  applicationName: 'Lumus',
  // Safari ignora buena parte del manifest y necesita lo suyo: sin esto, la
  // app instalada desde iOS abre con la barra del navegador arriba.
  appleWebApp: {
    capable: true,
    title: 'Lumus',
    // `black` y no `black-translucent`: con translucent el contenido pasa por
    // debajo de la barra de estado y el nav fijo de arriba queda tapado por la
    // hora y la señal. `black` reserva esa franja y le pone el fondo de la app.
    statusBarStyle: 'black',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  // Que el teclado achique el viewport en vez de taparle la mitad a la hoja
  // del formulario: sin esto, en Android el botón de guardar queda abajo del
  // teclado justo cuando terminaste de escribir el monto.
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${hankenGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#16161f',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#e2e0f0',
              fontFamily: 'var(--font-geist-sans)',
              fontSize: '0.875rem',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            },
          }}
          icons={{
            success: '✦',
            error: '✕',
            warning: '⚠',
            info: '·',
          }}
        />
      </body>
    </html>
  )
}
