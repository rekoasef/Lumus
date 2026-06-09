'use client'

import { useEffect, useState } from 'react'
import { Flame, Dumbbell, TrendingUp, Award } from 'lucide-react'
import type { MealLog } from '@/types/food.types'

interface DayData {
  date: string
  label: string
  calories: number
  protein: number
  isToday: boolean
}

interface WeeklyGoals {
  daily_calorie_goal: number | null
  daily_protein_goal: number | null
}

interface WeeklyNutritionChartProps {
  logs: MealLog[]
}

function getLast7Days(): { date: string; label: string; isToday: boolean }[] {
  const days = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    days.push({
      date: dateStr,
      label: labels[d.getDay()],
      isToday: i === 0,
    })
  }
  return days
}

export function WeeklyNutritionChart({ logs }: WeeklyNutritionChartProps) {
  const [goals, setGoals] = useState<WeeklyGoals>({ daily_calorie_goal: null, daily_protein_goal: null })

  useEffect(() => {
    fetch('/api/food/nutrition-goals')
      .then(r => r.json())
      .then(d => setGoals({
        daily_calorie_goal: d.daily_calorie_goal ?? d.suggested_calories ?? null,
        daily_protein_goal: d.daily_protein_goal ?? d.suggested_protein ?? null,
      }))
      .catch(() => {})
  }, [])

  const days = getLast7Days()

  const dayData: DayData[] = days.map(d => {
    const dayLogs = logs.filter(l => l.date === d.date)
    return {
      ...d,
      calories: dayLogs.reduce((s, l) => s + (l.calories ?? 0), 0),
      protein: dayLogs.reduce((s, l) => s + (l.protein_g ?? 0), 0),
    }
  })

  const maxCalories = Math.max(...dayData.map(d => d.calories), goals.daily_calorie_goal ?? 0, 1)
  const avgCalories = Math.round(dayData.reduce((s, d) => s + d.calories, 0) / 7)
  const avgProtein = Math.round(dayData.reduce((s, d) => s + d.protein, 0) / 7)
  const daysOnGoal = goals.daily_calorie_goal
    ? dayData.filter(d => d.calories > 0 && d.calories <= goals.daily_calorie_goal!).length
    : null

  const streak = (() => {
    if (!goals.daily_calorie_goal) return 0
    let count = 0
    for (let i = dayData.length - 1; i >= 0; i--) {
      const d = dayData[i]
      if (d.calories > 0 && d.calories <= goals.daily_calorie_goal) count++
      else break
    }
    return count
  })()

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
          <div className="flex justify-center mb-1"><Flame size={14} className="text-[#f97316]" /></div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{avgCalories}</p>
          <p className="text-[0.6rem] text-[var(--text-muted)]">prom kcal/día</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}>
          <div className="flex justify-center mb-1"><Dumbbell size={14} className="text-blue-400" /></div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{avgProtein}g</p>
          <p className="text-[0.6rem] text-[var(--text-muted)]">prom prot/día</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div className="flex justify-center mb-1"><Award size={14} className="text-green-400" /></div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {streak > 0 ? `🔥 ${streak}` : daysOnGoal !== null ? `${daysOnGoal}/7` : '—'}
          </p>
          <p className="text-[0.6rem] text-[var(--text-muted)]">
            {streak > 0 ? 'racha días' : 'días en meta'}
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Calorías — últimos 7 días</p>
          {goals.daily_calorie_goal && (
            <span className="text-[0.65rem] text-[var(--text-muted)]">meta: {goals.daily_calorie_goal} kcal</span>
          )}
        </div>

        <div className="flex items-end gap-2 h-28">
          {dayData.map(d => {
            const pct = d.calories > 0 ? (d.calories / maxCalories) * 100 : 0
            const overGoal = goals.daily_calorie_goal && d.calories > goals.daily_calorie_goal
            const onGoal = goals.daily_calorie_goal && d.calories > 0 && d.calories <= goals.daily_calorie_goal
            const barColor = overGoal ? '#ef4444' : onGoal ? '#22c55e' : d.isToday ? '#f97316' : '#3f3f5a'

            return (
              <div key={d.date} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-full flex flex-col justify-end" style={{ height: '88px' }}>
                  {d.calories > 0 && (
                    <div
                      className="w-full rounded-t-md transition-all duration-500"
                      style={{ height: `${Math.max(pct, 4)}%`, background: barColor, minHeight: '4px' }}
                      title={`${d.calories} kcal`}
                    />
                  )}
                  {d.calories === 0 && (
                    <div className="w-full h-1 rounded-full bg-white/10" />
                  )}
                </div>
                <p className={`text-[0.6rem] ${d.isToday ? 'text-[#f97316] font-semibold' : 'text-[var(--text-muted)]'}`}>
                  {d.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* Goal line indicator */}
        {goals.daily_calorie_goal && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-px flex-1 border-t border-dashed border-white/20" />
            <p className="text-[0.6rem] text-[var(--text-muted)]">línea de meta</p>
          </div>
        )}
      </div>

      {/* Protein bar chart */}
      {goals.daily_protein_goal && (
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Proteínas — últimos 7 días</p>
            <span className="text-[0.65rem] text-[var(--text-muted)]">meta: {goals.daily_protein_goal}g</span>
          </div>

          <div className="space-y-2">
            {dayData.map(d => {
              const pct = goals.daily_protein_goal
                ? Math.min((d.protein / goals.daily_protein_goal) * 100, 100)
                : 0
              return (
                <div key={d.date} className="flex items-center gap-2">
                  <p className={`text-[0.6rem] w-7 flex-shrink-0 ${d.isToday ? 'text-[#f97316]' : 'text-[var(--text-muted)]'}`}>
                    {d.label}
                  </p>
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 100 ? '#22c55e' : pct >= 70 ? '#60a5fa' : '#3b82f6',
                      }}
                    />
                  </div>
                  <p className="text-[0.6rem] text-[var(--text-muted)] w-8 text-right">{d.protein > 0 ? `${Math.round(d.protein)}g` : '—'}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {avgCalories === 0 && (
        <div className="py-6 text-center">
          <TrendingUp size={28} className="mx-auto mb-2 text-[var(--text-muted)]/40" />
          <p className="text-sm text-[var(--text-muted)]">Registrá comidas esta semana</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]/60">Los gráficos aparecerán cuando tengas datos</p>
        </div>
      )}
    </div>
  )
}
