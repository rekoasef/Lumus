'use client'

import { Plus, Trash2, Flame } from 'lucide-react'
import type { MealLog, MealType, Recipe } from '@/types/food.types'

const MEAL_CONFIG: Record<MealType, { label: string; emoji: string }> = {
  desayuno: { label: 'Desayuno', emoji: '☀️' },
  almuerzo: { label: 'Almuerzo', emoji: '🍽️' },
  merienda: { label: 'Merienda', emoji: '🫐' },
  cena:     { label: 'Cena', emoji: '🌙' },
}

const MEAL_ORDER: MealType[] = ['desayuno', 'almuerzo', 'merienda', 'cena']

interface MealLogSectionProps {
  date: string
  logsByMealType: Record<MealType, MealLog[]>
  totalCalories: number
  recipes: Recipe[]
  onAddLog: (mealType: MealType) => void
  onDeleteLog: (id: string) => Promise<boolean>
}

export function MealLogSection({
  date,
  logsByMealType,
  totalCalories,
  onAddLog,
  onDeleteLog,
}: MealLogSectionProps) {
  const dateLabel = (() => {
    const todayDate = new Date()
    const yesterdayDate = new Date(todayDate)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)

    const ls = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const today = ls(todayDate)
    const yesterday = ls(yesterdayDate)
    if (date === today) return 'Hoy'
    if (date === yesterday) return 'Ayer'
    return new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  })()

  return (
    <div className="space-y-4">
      {/* Header con calorías totales */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] capitalize">{dateLabel}</h2>
          {totalCalories > 0 && (
            <div className="mt-0.5 flex items-center gap-1.5">
              <Flame size={12} className="text-[#f97316]" />
              <span className="text-xs text-[var(--text-muted)]">{totalCalories} kcal totales</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {MEAL_ORDER.map(mealType => {
          const logs = logsByMealType[mealType]
          const config = MEAL_CONFIG[mealType]
          const mealCalories = logs.reduce((s, l) => s + (l.calories ?? 0), 0)

          return (
            <div
              key={mealType}
              className="lumus-glass rounded-xl"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{config.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{config.label}</p>
                    {mealCalories > 0 && (
                      <p className="text-[0.7rem] text-[var(--text-muted)]">{mealCalories} kcal</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onAddLog(mealType)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-secondary)]"
                >
                  <Plus size={12} />
                  Agregar
                </button>
              </div>

              {logs.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {logs.map(log => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between px-4 py-2.5"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--text-secondary)] truncate">{log.name ?? log.recipe?.title ?? 'Sin nombre'}</p>
                        {log.calories != null && (
                          <p className="text-[0.65rem] text-[var(--text-muted)]">{log.calories} kcal</p>
                        )}
                      </div>
                      <button
                        onClick={() => onDeleteLog(log.id)}
                        className="ml-3 flex-shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
