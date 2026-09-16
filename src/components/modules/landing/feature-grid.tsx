'use client'

import { useRef, type PointerEvent } from 'react'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import { Bell, CalendarClock, Coins, HandCoins, Target, Zap, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'
import { FEATURES } from './landing-copy'

const ICONS: Record<string, LucideIcon> = {
  fast: Zap,
  currency: Coins,
  budget: Bell,
  due: CalendarClock,
  goals: Target,
  loans: HandCoins,
}

/** Las dos primeras tarjetas son las grandes: son las que más usa la gente. */
const WIDE = new Set(['fast', 'currency'])

export function FeatureGrid() {
  return (
    <section className="px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <p className="lumus-label text-[#cfc6ff]">{FEATURES.eyebrow}</p>
          <h2 className="landing-title mt-4 text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">{FEATURES.title}</h2>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.items.map((item, i) => (
            <Reveal
              key={item.key}
              delay={0.06 * i}
              className={cn(WIDE.has(item.key) && 'lg:col-span-2')}
            >
              <FeatureCard icon={ICONS[item.key] ?? Zap} title={item.title} text={item.text} wide={WIDE.has(item.key)} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  text: string
  wide: boolean
}

/**
 * Una tarjeta con una luz que sigue al puntero por adentro. La luz se mueve
 * 1:1 con el puntero: si llegara tarde, parecería un efecto y no un reflejo.
 */
function FeatureCard({ icon: Icon, title, text, wide }: FeatureCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const background = useMotionTemplate`radial-gradient(260px circle at ${x}px ${y}px, rgba(189,180,255,0.14), transparent 70%)`

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set(event.clientX - rect.left)
    y.set(event.clientY - rect.top)
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={() => { x.set(-200); y.set(-200) }}
      className={cn(
        'group relative h-full overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-white/15',
        wide ? 'min-h-[13rem] sm:p-8' : 'min-h-[13rem]',
      )}
    >
      <motion.div className="pointer-events-none absolute inset-0" style={{ background }} aria-hidden />
      <div className="relative">
        <span className="grid size-11 place-items-center rounded-2xl border border-[var(--accent-lumus)]/20 bg-[var(--accent-muted)] text-[var(--accent-lumus)]">
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        <p className={cn('mt-6 font-semibold text-[var(--text-primary)]', wide ? 'text-xl sm:text-2xl' : 'text-lg')}>{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{text}</p>
      </div>
    </div>
  )
}
