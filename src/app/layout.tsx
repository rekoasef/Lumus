import type { Metadata } from 'next'
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
