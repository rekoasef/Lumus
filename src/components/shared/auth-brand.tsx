'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'

const BRAND = {
  name: 'LUMUS',
  tagline: 'Tus finanzas, claras.',
  description:
    'Billeteras, gastos, presupuestos y metas de ahorro en un solo lugar — con un reporte mensual escrito por IA.',
  logoAlt: 'Lumus',
} as const

/** El logo tiene aire propio, así que va con object-contain y sin recortes. */
function Logo({ size }: { size: number }) {
  return (
    <Image
      src="/logoLumus.png"
      alt={BRAND.logoAlt}
      width={size}
      height={size}
      priority
      className="object-contain"
      style={{ width: size, height: 'auto' }}
    />
  )
}

/** Panel de marca de la izquierda. Solo desktop: en mobile va `AuthBrandMark`. */
export function AuthBrandPanel() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative hidden w-[44%] max-w-[560px] shrink-0 flex-col justify-between overflow-hidden border-r border-white/[0.06] p-12 lg:flex">
      {/* Capas de fondo, de atrás hacia adelante */}
      <div className="lumus-panel-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 size-[36rem] rounded-full bg-[#7c6dfa]/[0.09] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-24 size-[30rem] rounded-full bg-[#ffb86e]/[0.045] blur-3xl"
        aria-hidden
      />

      {/* El orbe es el protagonista del panel: grande, centrado y bien visible.
          Respira lento — un solo movimiento, no una animación por elemento. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        aria-hidden
        animate={reduceMotion ? undefined : { scale: [1, 1.04, 1], opacity: [0.68, 0.88, 0.68] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{ opacity: 0.68 }}
      >
        <Image
          src="/lumus-orb.png"
          alt=""
          width={720}
          height={720}
          priority
          className="h-auto w-[32rem] xl:w-[40rem]"
        />
      </motion.div>

      {/* Con el orbe a esta intensidad, el título de abajo perdía contraste.
          Este degradado lo apaga hacia el pie sin tocar el centro. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        aria-hidden
        style={{ background: 'linear-gradient(to top, var(--bg-base) 12%, transparent 100%)' }}
      />

      <motion.div
        className="relative flex items-center gap-3"
        initial={reduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Logo size={34} />
        <span className="lumus-heading text-xl font-semibold tracking-[0.22em] text-[#e4dfff]">
          {BRAND.name}
        </span>
      </motion.div>

      <motion.div
        className="relative"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
      >
        <h2 className="lumus-heading text-[2.6rem] font-bold leading-[1.05] tracking-tight text-[var(--text-primary)]">
          Tus finanzas,
          <br />
          <span className="text-[#bdb4ff]">claras.</span>
        </h2>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
          {BRAND.description}
        </p>
      </motion.div>
    </div>
  )
}

/** Versión compacta para mobile, arriba del formulario. */
export function AuthBrandMark() {
  return (
    <div className="mb-7 flex flex-col items-center lg:hidden">
      <div className="flex items-center gap-2.5">
        <Logo size={30} />
        <span className="lumus-heading text-lg font-semibold tracking-[0.22em] text-[#e4dfff]">
          {BRAND.name}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{BRAND.tagline}</p>
    </div>
  )
}
