'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LivingOrbProps {
  size: number
  className?: string
  /** Si sigue al puntero. Apagado en los orbes chicos: ahí es ruido. */
  interactive?: boolean
  priority?: boolean
}

/**
 * Partículas fijas, no aleatorias: con `Math.random()` el servidor y el
 * navegador dibujarían cielos distintos y React se quejaría al hidratar.
 */
const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i * 137.5 * Math.PI) / 180 // ángulo áureo: reparte sin amontonar
  const radius = 0.34 + ((i * 7) % 10) * 0.018
  return {
    left: 50 + Math.cos(angle) * radius * 100,
    top: 50 + Math.sin(angle) * radius * 100,
    size: 1.5 + (i % 3),
    delay: (i * 0.37) % 4,
  }
})

/** Debajo de este tamaño, aros y partículas son ruido: queda el orbe con su brillo. */
const DETAIL_MIN_SIZE = 100

/** Resorte sin rebote: el orbe acompaña al puntero, no lo persigue. */
const FOLLOW = { stiffness: 90, damping: 22, mass: 0.8 }

/**
 * El orbe de Lumus, vivo.
 *
 * Capas, de atrás hacia adelante: el resplandor que respira, dos aros de luz
 * que giran en sentidos opuestos, las partículas, el orbe (que se inclina hacia
 * el puntero) y su reflejo en el piso. Los loops son CSS; lo que responde al
 * puntero es un resorte, que se puede redirigir en cualquier momento.
 */
export function LivingOrb({ size, className, interactive = true, priority = false }: LivingOrbProps) {
  const reduceMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const x = useSpring(useTransform(pointerX, v => v * 18), FOLLOW)
  const y = useSpring(useTransform(pointerY, v => v * 14), FOLLOW)
  const rotate = useSpring(useTransform(pointerX, v => v * 6), FOLLOW)
  const glowX = useTransform(x, v => v * -0.6)
  const glowY = useTransform(y, v => v * -0.6)
  const detailed = size >= DETAIL_MIN_SIZE

  useEffect(() => {
    if (!interactive || reduceMotion) return

    function handleMove(event: PointerEvent) {
      // -1 a 1 según dónde está el puntero en la ventana.
      pointerX.set((event.clientX / window.innerWidth) * 2 - 1)
      pointerY.set((event.clientY / window.innerHeight) * 2 - 1)
    }

    window.addEventListener('pointermove', handleMove, { passive: true })
    return () => window.removeEventListener('pointermove', handleMove)
  }, [interactive, reduceMotion, pointerX, pointerY])

  return (
    <div
      className={cn('relative isolate', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Resplandor */}
      <motion.div className="absolute inset-[-35%]" style={{ x: glowX, y: glowY }}>
        <div className="landing-breathe absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(157,140,255,0.42)_0%,rgba(124,109,250,0.16)_38%,transparent_68%)] blur-2xl" />
      </motion.div>

      {/* Aros */}
      {detailed && (
        <>
          <div className="landing-spin landing-ring absolute inset-[4%] rounded-full opacity-80 blur-[1px]" />
          <div className="landing-spin-reverse landing-ring absolute inset-[-6%] rounded-full opacity-40 blur-[2px]" />
        </>
      )}

      {/* Partículas */}
      {detailed && PARTICLES.map((p, i) => (
        <span
          key={i}
          className="landing-twinkle absolute rounded-full bg-[#e4dfff] shadow-[0_0_6px_rgba(200,190,255,0.9)]"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Orbe */}
      <motion.div className="absolute inset-0" style={{ x, y, rotate }}>
        <div className="landing-breathe absolute inset-[18%] rounded-full bg-[#7c6dfa]/30 blur-3xl" />
        <Image
          src="/lumus-orb.png"
          alt=""
          width={size}
          height={size}
          priority={priority}
          className="relative h-full w-full object-contain drop-shadow-[0_0_40px_rgba(157,140,255,0.55)]"
        />
      </motion.div>

      {/* Reflejo */}
      <div className="landing-breathe absolute bottom-[-4%] left-1/2 h-[7%] w-[58%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgba(157,140,255,0.75)_0%,transparent_70%)] blur-md" />
    </div>
  )
}
