'use client'

import { motion } from 'framer-motion'

interface ProfileHeaderProps {
  name: string
  email: string
  occupation: string | null
  createdAt: string
}

export function ProfileHeader({ name, email, occupation, createdAt }: ProfileHeaderProps) {
  const displayName = name || 'Sin nombre'
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const memberSince = new Date(createdAt).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <header className="relative">
      <span
        aria-hidden
        className="lumus-heading pointer-events-none absolute right-0 top-0 select-none text-[8rem] font-bold leading-none sm:text-[12rem]"
        style={{ color: 'rgba(124,109,250,0.07)' }}
      >
        {initial}
      </span>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative"
      >
        <p className="lumus-label text-[var(--text-muted)]">Cuenta</p>

        <h1
          className="lumus-heading mt-3 text-5xl font-bold leading-[1.05] sm:text-6xl"
          style={{
            backgroundImage: 'linear-gradient(120deg, var(--text-primary) 45%, var(--accent-lumus) 145%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {displayName}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-[var(--text-secondary)]">
          <span>{email}</span>
          {occupation && (
            <>
              <span className="text-[var(--text-muted)]">·</span>
              <span>{occupation}</span>
            </>
          )}
          <span className="text-[var(--text-muted)]">·</span>
          <span className="lumus-label text-[0.65rem] text-[var(--text-muted)]">Desde {memberSince}</span>
        </div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className="mt-7 h-px w-full origin-left bg-white/[0.08]"
        />
      </motion.div>
    </header>
  )
}
