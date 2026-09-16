'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { LivingOrb } from './living-orb'
import { HERO } from './landing-copy'

const ENTER = { type: 'spring' as const, bounce: 0, duration: 1 }

/**
 * La primera pantalla.
 *
 * Al hacer scroll el orbe crece y se desvanece, y el texto sube más rápido que
 * él: dos velocidades distintas son las que dan la sensación de profundidad.
 */
export function LandingHero() {
  const ref = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const orbScale = useTransform(scrollYProgress, [0, 1], [1, reduceMotion ? 1 : 1.5])
  const orbOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0])
  const orbY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 120])
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -140])
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0])

  return (
    <section ref={ref} className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 pt-20 pb-16">
      {/* Cielo */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-[-20%] left-1/2 size-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,109,250,0.18)_0%,transparent_60%)]" />
        <div className="absolute inset-0 lumus-panel-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      </div>

      {/* Dos capas: la de afuera responde al scroll y la de adentro a la
          entrada. En un mismo elemento se pisarían la opacidad. */}
      <motion.div style={{ scale: orbScale, opacity: orbOpacity, y: orbY }} className="relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...ENTER, duration: 1.4 }}
        >
          <LivingOrb size={260} priority className="sm:hidden" />
          <LivingOrb size={340} priority className="hidden sm:block" />
        </motion.div>
      </motion.div>

      <motion.div style={{ y: textY, opacity: textOpacity }} className="relative mt-6 max-w-3xl text-center sm:mt-10">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ENTER, delay: 0.35 }}
          className="lumus-label text-[#cfc6ff]"
        >
          {HERO.eyebrow}
        </motion.p>

        <h1 className="landing-display mt-4 text-[2.75rem] font-bold sm:text-7xl lg:text-8xl">
          {HERO.title.map((line, i) => (
            <motion.span
              key={line}
              initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ ...ENTER, delay: 0.45 + i * 0.12 }}
              className="landing-gradient-text block pb-1"
            >
              {line}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ENTER, delay: 0.75 }}
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg"
        >
          {HERO.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ENTER, delay: 0.9 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/register"
            className="group relative w-full overflow-hidden rounded-full bg-[var(--accent-lumus)] px-7 py-3.5 text-sm font-bold text-[#190f5d] shadow-[0_0_40px_rgba(157,140,255,0.45)] transition-transform active:scale-[0.97] sm:w-auto"
          >
            <span className="relative z-10">{HERO.cta}</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden />
          </Link>
          <a
            href="#informe"
            className="w-full rounded-full border border-white/12 px-7 py-3.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-white/[0.05] active:scale-[0.97] sm:w-auto"
          >
            {HERO.secondary}
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...ENTER, delay: 1.1 }}
          className="mt-4 text-xs text-[var(--text-muted)]"
        >
          {HERO.note}
        </motion.p>
      </motion.div>

      <motion.div style={{ opacity: textOpacity }} className="absolute bottom-6 [@media(max-height:940px)]:hidden" aria-hidden>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="flex flex-col items-center gap-1 text-[0.68rem] tracking-[0.2em] text-[var(--text-muted)] uppercase"
        >
          {HERO.scroll}
          <motion.span
            animate={reduceMotion ? undefined : { y: [0, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="size-4" />
          </motion.span>
        </motion.div>
      </motion.div>
    </section>
  )
}
