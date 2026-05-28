'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export type OrbState = 'idle' | 'thinking' | 'speaking' | 'listening'

// ── Orbe grande — para chat y páginas ────────────────────────────────────────

interface LumusOrbProps {
  state?: OrbState
  size?: number
  className?: string
}

function getMove(state: OrbState) {
  if (state === 'thinking')  return { y: [0, -4, 0], scale: [1, 1.03, 1] }
  if (state === 'speaking')  return { y: [0, -5, 0], scale: [1, 1.03, 1] }
  if (state === 'listening') return { y: [0, -3, 0], scale: [1, 1.03, 1] }
  return { y: [0, -7, 0], scale: [1, 1.02, 1] }
}

function getGlow(state: OrbState): string[] {
  if (state === 'listening') return [
    'drop-shadow(0 0 12px rgba(34,197,94,0.4)) drop-shadow(0 0 24px rgba(124,109,250,0.25))',
    'drop-shadow(0 0 22px rgba(34,197,94,0.65)) drop-shadow(0 0 40px rgba(124,109,250,0.35))',
    'drop-shadow(0 0 12px rgba(34,197,94,0.4)) drop-shadow(0 0 24px rgba(124,109,250,0.25))',
  ]
  if (state === 'thinking') return [
    'drop-shadow(0 0 12px rgba(124,109,250,0.5)) drop-shadow(0 0 24px rgba(124,109,250,0.3))',
    'drop-shadow(0 0 24px rgba(160,140,255,0.7)) drop-shadow(0 0 44px rgba(124,109,250,0.45))',
    'drop-shadow(0 0 12px rgba(124,109,250,0.5)) drop-shadow(0 0 24px rgba(124,109,250,0.3))',
  ]
  if (state === 'speaking') return [
    'drop-shadow(0 0 14px rgba(124,109,250,0.55)) drop-shadow(0 0 28px rgba(124,109,250,0.35))',
    'drop-shadow(0 0 28px rgba(170,150,255,0.75)) drop-shadow(0 0 50px rgba(124,109,250,0.5))',
    'drop-shadow(0 0 14px rgba(124,109,250,0.55)) drop-shadow(0 0 28px rgba(124,109,250,0.35))',
  ]
  return [
    'drop-shadow(0 0 8px rgba(124,109,250,0.35)) drop-shadow(0 0 18px rgba(124,109,250,0.2))',
    'drop-shadow(0 0 18px rgba(150,130,255,0.6)) drop-shadow(0 0 34px rgba(124,109,250,0.35))',
    'drop-shadow(0 0 8px rgba(124,109,250,0.35)) drop-shadow(0 0 18px rgba(124,109,250,0.2))',
  ]
}

function getDuration(state: OrbState) {
  return state === 'thinking' ? 2.2 : state === 'speaking' ? 1.8 : state === 'listening' ? 2.0 : 4.5
}

export function LumusOrb({ state = 'idle', size = 140, className }: LumusOrbProps) {
  const dur = getDuration(state)

  return (
    <div
      className={`relative flex items-center justify-center ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      {/* Halo de fondo */}
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{ width: size * 0.75, height: size * 0.75 }}
        animate={{ opacity: [0.15, 0.45, 0.15] }}
        transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />

      {/* Orbe con float + glow */}
      <motion.div
        animate={getMove(state)}
        transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          animate={{ filter: getGlow(state) }}
          transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image
            src="/lumus-orb.png"
            width={size}
            height={size}
            alt="Lumus"
            priority
            style={{ objectFit: 'contain', display: 'block' }}
          />
        </motion.div>
      </motion.div>

      {/* Reflejo inferior */}
      {size >= 80 && (
        <motion.div
          className="pointer-events-none absolute rounded-full"
          style={{
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: size * 0.52,
            height: size * 0.06,
            background: 'radial-gradient(ellipse, rgba(124,109,250,0.6) 0%, transparent 70%)',
          }}
          animate={{ opacity: [0.4, 0.9, 0.4], scaleX: [1, 1.25, 1] }}
          transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />
      )}
    </div>
  )
}

// ── Ícono inline — para botones y avatares ────────────────────────────────────

interface LumusOrbIconProps {
  size?: number
  state?: OrbState
}

export function LumusOrbIcon({ size = 22, state = 'idle' }: LumusOrbIconProps) {
  const dur = state === 'thinking' ? 2.2 : 3.5

  return (
    <motion.div
      style={{ width: size, height: size, flexShrink: 0, display: 'inline-flex' }}
      animate={{ scale: state === 'thinking' ? [1, 1.05, 1] : [1, 1.04, 1] }}
      transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        style={{ width: size, height: size }}
        animate={{
          filter: [
            'drop-shadow(0 0 4px rgba(124,109,250,0.5))',
            'drop-shadow(0 0 10px rgba(160,140,255,0.75))',
            'drop-shadow(0 0 4px rgba(124,109,250,0.5))',
          ],
        }}
        transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image
          src="/lumus-orb.png"
          width={size}
          height={size}
          alt="Lumus"
          style={{ objectFit: 'contain', display: 'block' }}
        />
      </motion.div>
    </motion.div>
  )
}
