'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { STATEMENT } from './landing-copy'

/**
 * Una frase que se enciende palabra por palabra mientras bajás.
 *
 * La sección es más alta que la pantalla y el texto queda fijo adentro: el
 * scroll no mueve la frase, la va leyendo.
 */
export function ScrollStatement() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.6'] })
  const words = STATEMENT.split(' ')

  return (
    <section ref={ref} className="relative h-[180vh] px-4">
      <div className="sticky top-0 flex h-[100svh] items-center justify-center">
        <p className="landing-title mx-auto max-w-4xl text-center text-3xl font-semibold sm:text-5xl lg:text-6xl">
          {words.map((word, i) => (
            <Word key={`${word}-${i}`} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
              {word}
            </Word>
          ))}
        </p>
      </div>
    </section>
  )
}

interface WordProps {
  children: string
  progress: MotionValue<number>
  range: [number, number]
}

function Word({ children, progress, range }: WordProps) {
  const opacity = useTransform(progress, range, [0.14, 1])
  const glow = useTransform(progress, [range[0], range[1], range[1] + 0.08], [0, 1, 0])
  const textShadow = useTransform(glow, v => `0 0 ${24 * v}px rgba(189,180,255,${0.55 * v})`)

  return (
    <motion.span style={{ opacity, textShadow }} className="mr-[0.25em] inline-block text-[var(--text-primary)]">
      {children}
    </motion.span>
  )
}
