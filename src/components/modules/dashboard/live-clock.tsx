'use client'

import { useState, useEffect } from 'react'

export function LiveClock() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!time) {
    return (
      <div className="flex items-baseline gap-1.5">
        <div className="h-14 w-36 animate-pulse rounded-xl bg-white/5 md:h-[4.5rem] md:w-44" />
        <div className="h-7 w-10 animate-pulse rounded-lg bg-white/5" />
      </div>
    )
  }

  const h = time.getHours().toString().padStart(2, '0')
  const m = time.getMinutes().toString().padStart(2, '0')
  const s = time.getSeconds().toString().padStart(2, '0')

  return (
    <div className="flex items-baseline gap-1.5 tabular-nums">
      <span
        className="text-6xl font-bold leading-none tracking-tight text-[var(--text-primary)] md:text-[4.5rem]"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {h}:{m}
      </span>
      <span className="text-xl font-light leading-none text-[var(--text-muted)] md:text-2xl">
        :{s}
      </span>
    </div>
  )
}
