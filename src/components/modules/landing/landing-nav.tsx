'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { cn } from '@/lib/utils'
import { NAV } from './landing-copy'

/**
 * La barra de arriba. Transparente sobre el hero y de vidrio apenas el
 * contenido empieza a pasar por debajo: el material aparece cuando hace falta
 * separar, no antes.
 */
export function LandingNav() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useMotionValueEvent(scrollY, 'change', value => setScrolled(value > 24))

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.8, delay: 0.2 }}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled ? 'landing-glass border-b border-white/[0.06]' : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Lumus, inicio">
          <span className="relative grid size-8 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
            <Image
              src="/logoLumus.png"
              alt=""
              width={64}
              height={64}
              className="h-full w-full scale-[2.7] object-cover opacity-90 mix-blend-screen"
            />
          </span>
          <span className="lumus-heading text-[0.95rem] font-semibold tracking-[0.18em] text-[#e4dfff]">LUMUS</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className="rounded-full px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            {NAV.login}
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-sm font-semibold text-[#0b0b12] transition-transform active:scale-[0.97]"
          >
            {NAV.cta}
          </Link>
        </div>
      </nav>
    </motion.header>
  )
}
