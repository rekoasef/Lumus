'use client'

import { useEffect, useState } from 'react'
import { Flame, Dumbbell, Settings2, X, Check } from 'lucide-react'
import type { NutritionGoals, ActivityLevel } from '@/types/food.types'

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentario: 'Sedentario',
  moderado: 'Moderado',
  activo: 'Activo',
  muy_activo: 'Muy activo',
}

interface NutritionGoalBannerProps {
  totalCalories: number
  totalProtein: number
}

export function NutritionGoalBanner({ totalCalories, totalProtein }: NutritionGoalBannerProps) {
  const [goals, setGoals] = useState<NutritionGoals & { suggested_calories: number | null; suggested_protein: number | null } | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [loading, setLoading] = useState(true)

  // form state
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderado')
  const [trains, setTrains] = useState(false)
  const [manualCalories, setManualCalories] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/food/nutrition-goals')
      .then(r => r.json())
      .then(d => {
        setGoals(d)
        setActivityLevel(d.activity_level ?? 'moderado')
        setTrains(d.trains ?? false)
        setManualCalories(d.daily_calorie_goal?.toString() ?? '')
        setManualProtein(d.daily_protein_goal?.toString() ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/food/nutrition-goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_level: activityLevel,
        trains,
        daily_calorie_goal: manualCalories ? parseInt(manualCalories) : null,
        daily_protein_goal: manualProtein ? parseInt(manualProtein) : null,
      }),
    })
    const updated = await fetch('/api/food/nutrition-goals').then(r => r.json())
    setGoals(updated)
    setSaving(false)
    setShowConfig(false)
  }

  if (loading) {
    return (
      <div className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" style={{ border: '1px solid rgba(255,255,255,0.06)' }} />
    )
  }

  const calGoal = goals?.daily_calorie_goal ?? goals?.suggested_calories
  const protGoal = goals?.daily_protein_goal ?? goals?.suggested_protein

  const calPct = calGoal ? Math.min((totalCalories / calGoal) * 100, 100) : null
  const protPct = protGoal ? Math.min((totalProtein / protGoal) * 100, 100) : null

  const calColor = !calPct ? '#f97316'
    : calPct >= 100 ? '#ef4444'
    : calPct >= 85 ? '#f59e0b'
    : '#22c55e'

  return (
    <>
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#f97316]/80">
            Meta del día
          </p>
          <button
            onClick={() => setShowConfig(true)}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-secondary)] transition-colors"
          >
            <Settings2 size={13} />
          </button>
        </div>

        {/* Calorías */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame size={13} className="text-[#f97316]" />
              <span className="text-xs text-[var(--text-secondary)]">Calorías</span>
            </div>
            <span className="text-xs font-medium text-[var(--text-primary)]">
              {totalCalories}
              {calGoal ? <span className="text-[var(--text-muted)] font-normal"> / {calGoal} kcal</span> : <span className="text-[var(--text-muted)] font-normal"> kcal</span>}
            </span>
          </div>
          {calGoal && (
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${calPct}%`, background: calColor }}
              />
            </div>
          )}
        </div>

        {/* Proteínas */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Dumbbell size={13} className="text-blue-400" />
              <span className="text-xs text-[var(--text-secondary)]">Proteínas</span>
            </div>
            <span className="text-xs font-medium text-[var(--text-primary)]">
              {totalProtein.toFixed(0)}g
              {protGoal ? <span className="text-[var(--text-muted)] font-normal"> / {protGoal}g</span> : null}
            </span>
          </div>
          {protGoal && (
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400 transition-all duration-500"
                style={{ width: `${protPct}%` }}
              />
            </div>
          )}
        </div>

        {!calGoal && !protGoal && (
          <button
            onClick={() => setShowConfig(true)}
            className="w-full text-center text-xs text-[#f97316]/70 hover:text-[#f97316] transition-colors pt-1"
          >
            Configurá tu meta calórica →
          </button>
        )}
      </div>

      {/* Modal de configuración */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-5" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Meta nutricional diaria</h3>
              <button onClick={() => setShowConfig(false)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10">
                <X size={14} />
              </button>
            </div>

            {/* Nivel de actividad */}
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-muted)]">Nivel de actividad</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setActivityLevel(level)}
                    className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      activityLevel === level
                        ? 'bg-[#f97316] text-white'
                        : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10'
                    }`}
                  >
                    {ACTIVITY_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>

            {/* Entrena */}
            <button
              onClick={() => setTrains(t => !t)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all ${
                trains ? 'bg-blue-500/15 text-blue-400' : 'bg-white/5 text-[var(--text-muted)]'
              }`}
              style={{ border: `1px solid ${trains ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.07)'}` }}
            >
              <div className="flex items-center gap-2">
                <Dumbbell size={14} />
                <span className="text-xs font-medium">Entreno regularmente</span>
              </div>
              {trains && <Check size={13} />}
            </button>

            {goals?.suggested_calories && (
              <p className="text-[0.7rem] text-[var(--text-muted)] text-center">
                Meta sugerida: ~{goals.suggested_calories} kcal · ~{goals.suggested_protein}g proteína
              </p>
            )}

            {/* Metas manuales */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-[0.7rem] text-[var(--text-muted)]">Calorías/día (opcional)</p>
                <input
                  type="number"
                  value={manualCalories}
                  onChange={e => setManualCalories(e.target.value)}
                  placeholder={goals?.suggested_calories?.toString() ?? 'Auto'}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#f97316]/50 focus:outline-none"
                />
              </div>
              <div>
                <p className="mb-1.5 text-[0.7rem] text-[var(--text-muted)]">Proteína/día g (opcional)</p>
                <input
                  type="number"
                  value={manualProtein}
                  onChange={e => setManualProtein(e.target.value)}
                  placeholder={goals?.suggested_protein?.toString() ?? 'Auto'}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#f97316]/50 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-[#f97316] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#ea6c0c] disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar meta'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
