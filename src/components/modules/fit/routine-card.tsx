'use client'

import { useState } from 'react'
import { Play, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { WorkoutRoutine } from '@/types/fit.types'

const GOAL_CONFIG: Record<string, { label: string; color: string }> = {
  hipertrofia: { label: 'Hipertrofia', color: '#f97316' },
  fuerza:      { label: 'Fuerza',      color: '#ef4444' },
  definicion:  { label: 'Definición',  color: '#22d3ee' },
  cardio:      { label: 'Cardio',      color: '#22c55e' },
}

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  pecho:     'Pecho',
  espalda:   'Espalda',
  piernas:   'Piernas',
  hombros:   'Hombros',
  brazos:    'Brazos',
  abdomen:   'Abdomen',
  cardio:    'Cardio',
  full_body: 'Full body',
}

interface RoutineCardProps {
  routine: WorkoutRoutine
  onDelete: (id: string) => Promise<boolean>
  onLog: (routine: WorkoutRoutine) => void
}

export function RoutineCard({ routine, onDelete, onLog }: RoutineCardProps) {
  const [expanded, setExpanded] = useState(false)
  const goalConfig = routine.goal ? GOAL_CONFIG[routine.goal] : null
  const exercises = routine.exercises ?? []

  return (
    <div
      className="lumus-glass rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">{routine.name}</h3>
              {goalConfig && (
                <span
                  className="rounded-full px-2 py-0.5 text-[0.6rem] font-medium"
                  style={{ background: `${goalConfig.color}18`, color: goalConfig.color }}
                >
                  {goalConfig.label}
                </span>
              )}
            </div>
            {routine.description && (
              <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-1">{routine.description}</p>
            )}
            {exercises.length > 0 && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {exercises.length} ejercicio{exercises.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onLog(routine)}
              className="flex items-center gap-1.5 rounded-lg bg-[#22d3ee]/15 px-2.5 py-1.5 text-xs font-medium text-[#22d3ee] transition-colors hover:bg-[#22d3ee]/25"
              title="Registrar sesión"
            >
              <Play size={11} />
              Iniciar
            </button>
            <button
              onClick={() => onDelete(routine.id)}
              className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {exercises.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-3 flex items-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Ocultar ejercicios' : 'Ver ejercicios'}
          </button>
        )}
      </div>

      {expanded && exercises.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {exercises
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((ex, i) => (
              <div
                key={ex.id}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: i < exercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--text-secondary)]">
                    {ex.exercise?.name ?? 'Ejercicio'}
                  </p>
                  {ex.exercise?.muscle_group && (
                    <p className="text-[0.65rem] text-[var(--text-muted)]">
                      {MUSCLE_GROUP_LABELS[ex.exercise.muscle_group] ?? ex.exercise.muscle_group}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  {ex.sets != null && <span>{ex.sets} series</span>}
                  {ex.reps != null && <span>× {ex.reps}</span>}
                  {ex.rest_seconds != null && <span>{ex.rest_seconds}s</span>}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
