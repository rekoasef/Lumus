import Image from 'next/image'
import Link from 'next/link'
import { LegalLinks } from '@/components/shared/legal-links'

const LABELS = {
  home: 'Lumus, inicio',
  brand: 'LUMUS',
} as const

/**
 * Lo legal: términos, privacidad y los dos botones de la Ley 24.240. Todo
 * público, con sesión o sin ella (ver las rutas abiertas del proxy).
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:h-16">
          <Link href="/" className="flex items-center gap-2.5" aria-label={LABELS.home}>
            <span className="relative grid size-8 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
              <Image src="/logoLumus.png" alt="" width={64} height={64} className="h-full w-full scale-[2.7] object-cover opacity-90 mix-blend-screen" />
            </span>
            <span className="lumus-heading text-[0.95rem] font-semibold tracking-[0.18em] text-[#e4dfff]">{LABELS.brand}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-10 sm:py-16">{children}</main>

      <footer className="border-t border-white/[0.06] px-4 py-8">
        <LegalLinks className="mx-auto max-w-3xl" showOwner />
      </footer>
    </div>
  )
}
