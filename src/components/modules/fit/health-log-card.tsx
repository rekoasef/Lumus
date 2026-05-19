'use client'

import { Droplets, Moon, Footprints, Plus, Minus } from 'lucide-react'
import type { HealthLog } from '@/types/fit.types'

const WATER_GOAL_ML = 2000
const WATER_INCREMENTS = [200, 300, 500]

interface HealthLogCardProps {
  log: HealthLog | null
  onAddWater: (ml: number) => Promise<boolean>
  onSetSleep: (hours: number) => Promise<boolean>
  onSetSteps: (steps: number) => Promise<boolean>
}

export function HealthLogCard({ log, onAddWater, onSetSleep, onSetSteps }: HealthLogCardProps) {
  const waterMl = log?.water_ml ?? 0
  const waterPct = Math.min((waterMl / WATER_GOAL_ML) * 100, 100)
  const sleepHours = log?.sleep_hours ?? null
  const steps = log?.steps ?? null

  return (
    <div className="space-y-3">
      {/* Agua */}
      <div
        className="lumus-glass rounded-xl p-4"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0ea5e9]/15">
              <Droplets size={15} className="text-[#0ea5e9]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Agua</p>
              <p className="text-xs text-[var(--text-muted)]">{waterMl} / {WATER_GOAL_ML} ml</p>
            </div>
          </div>
          <span className="text-sm font-semibold text-[#0ea5e9]">{Math.round(waterPct)}%</span>
        </div>

        {/* Progress bar */}
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${waterPct}%`, background: '#0ea5e9' }}
          />
        </div>

        <div className="flex gap-2">
          {WATER_INCREMENTS.map(ml => (
            <button
              key={ml}
              onClick={() => onAddWater(ml)}
              className="flex-1 rounded-xl border border-white/10 py-2 text-xs text-[var(--text-muted)] transition-colors hover:border-[#0ea5e9]/30 hover:bg-[#0ea5e9]/10 hover:text-[#0ea5e9]"
            >
              +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Sueño */}
        <div
          className="lumus-glass rounded-xl p-4"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#a855f7]/15">
              <Moon size={13} className="text-[#a855f7]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Sueño</p>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] mb-3">
            {sleepHours != null ? `${sleepHours}h` : '—'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSetSleep(Math.max(0, (sleepHours ?? 0) - 0.5))}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
            >
              <Minus size={12} />
            </button>
            <div className="flex-1 text-center text-xs text-[var(--text-muted)]">horas</div>
            <button
              onClick={() => onSetSleep(Math.min(24, (sleepHours ?? 0) + 0.5))}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* Pasos */}
        <div
          className="lumus-glass rounded-xl p-4"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#22d3ee]/15">
              <Footprints size={13} className="text-[#22d3ee]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Pasos</p>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] mb-3">
            {steps != null ? steps.toLocaleString('es-AR') : '—'}
          </p>
          <div className="flex gap-1">
            {[1000, 5000, 10000].map(n => (
              <button
                key={n}
                onClick={() => onSetSteps(n)}
                className={`flex-1 rounded-lg py-1.5 text-[0.65rem] transition-colors ${
                  steps === n
                    ? 'bg-[#22d3ee]/20 text-[#22d3ee]'
                    : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10'
                }`}
              >
                {n >= 1000 ? `${n / 1000}k` : n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
