'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Segundos de espera, para escalonar elementos hermanos. */
  delay?: number
  as?: 'div' | 'li' | 'section'
}

/**
 * Aparece al entrar en pantalla, una sola vez.
 *
 * Resorte sin rebote: es contenido que llega, no algo que el usuario tiró. Con
 * movimiento reducido queda solo el fundido.
 */
export function Reveal({ children, className, delay = 0, as = 'div' }: RevealProps) {
  const reduceMotion = useReducedMotion()
  const Component = motion[as]

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 28, filter: reduceMotion ? 'none' : 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ type: 'spring', bounce: 0, duration: 0.9, delay }}
    >
      {children}
    </Component>
  )
}
