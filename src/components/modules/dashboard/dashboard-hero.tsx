'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LumusOrb } from '@/components/lumus/lumus-orb'
import { LumusFullscreen } from '@/components/lumus/lumus-fullscreen'
import { LiveClock } from './live-clock'
import { WeatherWidget } from './weather-widget'
import { CurrencyWidget } from './currency-widget'

interface DashboardHeroProps {
  firstName: string
  date: string
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function DashboardHero({ firstName, date }: DashboardHeroProps) {
  const [greeting, setGreeting] = useState('')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  return (
    <>
      <section
        className="relative mx-auto max-w-[1120px] overflow-hidden rounded-[2rem]"
        style={{
          background: 'linear-gradient(135deg, rgba(17,17,24,0.95) 0%, rgba(12,10,20,0.98) 100%)',
          border: '1px solid rgba(124,109,250,0.12)',
          boxShadow: '0 0 60px rgba(124,109,250,0.08), 0 32px 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute rounded-full"
            style={{
              width: '600px', height: '600px',
              top: '-200px', left: '-100px',
              background: 'radial-gradient(circle, rgba(124,109,250,0.08) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: '400px', height: '400px',
              bottom: '-100px', right: '-50px',
              background: 'radial-gradient(circle, rgba(124,109,250,0.05) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative px-4 py-5 sm:px-6 sm:py-6 md:px-10 md:py-8">
          <div className="grid gap-6 md:grid-cols-[380px_1fr] md:gap-8">

            {/* IZQUIERDA — Orbe (clicable) */}
            <div className="relative flex flex-col items-center justify-center gap-3">
              <div
                className="pointer-events-none absolute rounded-full"
                style={{
                  width: '320px', height: '320px',
                  background: 'radial-gradient(circle, rgba(124,109,250,0.22) 0%, rgba(124,109,250,0.08) 45%, transparent 70%)',
                }}
              />

              {/* Orbe con hover + click */}
              <motion.button
                onClick={() => setFullscreenOpen(true)}
                className="relative rounded-full focus:outline-none"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                title="Hablar con Lumus"
              >
                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-full"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  style={{
                    border: '1.5px solid rgba(124,109,250,0.35)',
                    boxShadow: '0 0 40px rgba(124,109,250,0.18)',
                  }}
                />
                {/* Tamaño responsivo: 200px mobile, 280px sm, 360px md+ */}
                <span className="block md:hidden"><LumusOrb state="idle" size={200} /></span>
                <span className="hidden sm:block md:hidden"><LumusOrb state="idle" size={260} /></span>
                <span className="hidden md:block"><LumusOrb state="idle" size={360} /></span>
              </motion.button>

              <div className="text-center">
                <p className="text-[0.55rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Sistema activo
                </p>
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  <span className="text-xs text-[#22c55e]">Lumus online</span>
                </div>
              </div>
            </div>

            {/* DERECHA — info */}
            <div className="flex flex-col justify-between gap-5 md:gap-6">
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {date}
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)] md:text-3xl">
                  {greeting},{' '}
                  <span style={{ color: '#bdb4ff' }}>{firstName}</span>
                </h1>
              </div>

              <LiveClock />

              <div
                className="rounded-2xl px-5 py-4"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <WeatherWidget />
              </div>

              <CurrencyWidget />
            </div>
          </div>
        </div>
      </section>

      {/* Fullscreen Lumus */}
      <AnimatePresence>
        {fullscreenOpen && (
          <LumusFullscreen onClose={() => setFullscreenOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
