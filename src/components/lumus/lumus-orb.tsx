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
  if (state === 'thinking') return { y: [0, -5, 5, -5, 0], scale: [1, 1.07, 0.95, 1.07, 1] }
  if (state === 'speaking') return { y: [0, -7, 0], scale: [1, 1.09, 1.02, 1] }
  if (state === 'listening') return { y: [0, -4, 0, -4, 0], scale: [1, 1.1, 1, 1.1, 1] }
  return { y: [0, -10, 0], scale: [1, 1.03, 1] }
}

function getGlow(state: OrbState): string[] {
  if (state === 'listening') return [
    'drop-shadow(0 0 18px rgba(34,197,94,0.7)) drop-shadow(0 0 36px rgba(124,109,250,0.4))',
    'drop-shadow(0 0 40px rgba(34,197,94,1.0)) drop-shadow(0 0 70px rgba(124,109,250,0.6))',
    'drop-shadow(0 0 18px rgba(34,197,94,0.7)) drop-shadow(0 0 36px rgba(124,109,250,0.4))',
  ]
  if (state === 'thinking') return [
    'drop-shadow(0 0 16px rgba(124,109,250,0.8)) drop-shadow(0 0 32px rgba(124,109,250,0.5))',
    'drop-shadow(0 0 40px rgba(180,150,255,1.0)) drop-shadow(0 0 70px rgba(124,109,250,0.8))',
    'drop-shadow(0 0 16px rgba(124,109,250,0.8)) drop-shadow(0 0 32px rgba(124,109,250,0.5))',
  ]
  if (state === 'speaking') return [
    'drop-shadow(0 0 20px rgba(124,109,250,0.9)) drop-shadow(0 0 40px rgba(124,109,250,0.6))',
    'drop-shadow(0 0 50px rgba(200,170,255,1.0)) drop-shadow(0 0 90px rgba(124,109,250,0.9))',
    'drop-shadow(0 0 25px rgba(124,109,250,0.8)) drop-shadow(0 0 50px rgba(124,109,250,0.6))',
    'drop-shadow(0 0 20px rgba(124,109,250,0.9)) drop-shadow(0 0 40px rgba(124,109,250,0.6))',
  ]
  return [
    'drop-shadow(0 0 10px rgba(124,109,250,0.5)) drop-shadow(0 0 22px rgba(124,109,250,0.3))',
    'drop-shadow(0 0 26px rgba(160,130,255,0.9)) drop-shadow(0 0 50px rgba(124,109,250,0.6))',
    'drop-shadow(0 0 10px rgba(124,109,250,0.5)) drop-shadow(0 0 22px rgba(124,109,250,0.3))',
  ]
}

function getDuration(state: OrbState) {
  return state === 'thinking' ? 0.65 : state === 'speaking' ? 1.1 : state === 'listening' ? 1.2 : 4
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
  const dur = state === 'thinking' ? 0.65 : 2.5

  return (
    <motion.div
      style={{ width: size, height: size, flexShrink: 0, display: 'inline-flex' }}
      animate={{ scale: state === 'thinking' ? [1, 1.12, 0.92, 1.12, 1] : [1, 1.06, 1] }}
      transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        style={{ width: size, height: size }}
        animate={{
          filter: [
            'drop-shadow(0 0 5px rgba(124,109,250,0.7))',
            'drop-shadow(0 0 14px rgba(180,150,255,1.0))',
            'drop-shadow(0 0 5px rgba(124,109,250,0.7))',
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
