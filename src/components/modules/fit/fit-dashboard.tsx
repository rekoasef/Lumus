'use client'

import { useState } from 'react'
import { Plus, Dumbbell, Trash2 } from 'lucide-react'
import { LumusOrbIcon } from '@/components/lumus/lumus-orb'
import { useHealthLog } from '@/hooks/use-health-log'
import { useBodyRecords } from '@/hooks/use-body-records'
import { useWorkoutRoutines } from '@/hooks/use-workout-routines'
import { useWorkoutSessions } from '@/hooks/use-workout-sessions'
import { HealthLogCard } from './health-log-card'
import { BodyRecordForm } from './body-record-form'
import { BodyProgressChart } from './body-progress-chart'
import { RoutineCard } from './routine-card'
import { RoutineForm } from './routine-form'
import { SessionLogForm } from './session-log-form'
import { LumusChat } from '@/components/lumus/lumus-chat'
import type { HealthLog, BodyRecord, WorkoutRoutine, WorkoutExercise, WorkoutSession } from '@/types/fit.types'

type Section = 'hoy' | 'rutinas' | 'cuerpo'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'hoy',     label: 'Hoy' },
  { id: 'rutinas', label: 'Rutinas' },
  { id: 'cuerpo',  label: 'Cuerpo' },
]

const LUMUS_SUGGESTIONS = [
  '¿Cómo estuvo mi semana de entrenamiento?',
  'Sugerí una rutina de hipertrofia',
  '¿Cuánto debería tomar de agua?',
  'Analizá mi progreso de peso',
]

interface FitDashboardProps {
  initialHealthLog: HealthLog | null
  initialBodyRecords: BodyRecord[]
  initialRoutines: WorkoutRoutine[]
  initialExercises: WorkoutExercise[]
  initialSessions: WorkoutSession[]
}

export function FitDashboard({
  initialHealthLog,
  initialBodyRecords,
  initialRoutines,
  initialExercises,
  initialSessions,
}: FitDashboardProps) {
  const today = new Date().toISOString().split('T')[0]

  const [activeSection, setActiveSection] = useState<Section>('hoy')
  const [showRoutineForm, setShowRoutineForm] = useState(false)
  const [showBodyForm, setShowBodyForm] = useState(false)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessionRoutine, setSessionRoutine] = useState<WorkoutRoutine | null>(null)
  const [showLumus, setShowLumus] = useState(false)

  const { log, addWater, setSleep, setSteps } = useHealthLog(initialHealthLog, today)
  const { records, latestWeight, weightTrend, addRecord } = useBodyRecords(initialBodyRecords)
  const { routines, exercises, createRoutine, deleteRoutine, createExercise } = useWorkoutRoutines(initialRoutines, initialExercises)
  const { sessions, totalSessionsThisWeek, getSessionsForDate, logSession, deleteSession } = useWorkoutSessions(initialSessions)

  const todaySessions = getSessionsForDate(today)

  function handleLogRoutine(routine: WorkoutRoutine) {
    setSessionRoutine(routine)
    setShowSessionForm(true)
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Fit & Salud</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {totalSessionsThisWeek} entreno{totalSessionsThisWeek !== 1 ? 's' : ''} esta semana
            {latestWeight != null && ` · ${latestWeight} kg`}
          </p>
        </div>
        <button
          onClick={() => setShowLumus(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent-muted)] px-3.5 py-2 text-sm font-medium text-[var(--accent-lumus)] transition-colors hover:bg-[var(--accent-lumus)]/20"
        >
          <LumusOrbIcon size={22} />
          Lumus
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              activeSection === s.id
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* HOY */}
      {activeSection === 'hoy' && (
        <div className="space-y-5">
          <HealthLogCard
            log={log}
            onAddWater={addWater}
            onSetSleep={setSleep}
            onSetSteps={setSteps}
          />

          {/* Entrenamientos de hoy */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Entrenamientos de hoy</h2>
              <button
                onClick={() => { setSessionRoutine(null); setShowSessionForm(true) }}
                className="flex items-center gap-1.5 rounded-xl bg-[#22d3ee]/15 px-3 py-1.5 text-xs font-medium text-[#22d3ee] transition-colors hover:bg-[#22d3ee]/25"
              >
                <Plus size={12} />
                Registrar
              </button>
            </div>

            {todaySessions.length === 0 ? (
              <div
                className="lumus-glass rounded-xl py-8 text-center"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <Dumbbell size={24} className="mx-auto mb-2 text-[var(--text-muted)]/40" />
                <p className="text-sm text-[var(--text-muted)]">Sin entrenamientos registrados hoy</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]/60">¡A moverlo!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaySessions.map(session => (
                  <div
                    key={session.id}
                    className="lumus-glass flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {session.routine?.name ?? 'Entreno libre'}
                      </p>
                      <div className="mt-0.5 flex items-center gap-3">
                        {session.duration_min != null && (
                          <span className="text-xs text-[var(--text-muted)]">{session.duration_min} min</span>
                        )}
                        {session.routine?.goal && (
                          <span className="text-xs text-[var(--text-muted)] capitalize">{session.routine.goal}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RUTINAS */}
      {activeSection === 'rutinas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              {routines.length} rutina{routines.length !== 1 ? 's' : ''} guardada{routines.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setShowRoutineForm(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#22d3ee] px-3 py-2 text-xs font-medium text-[#0a0a0f] transition-colors hover:bg-[#06b6d4]"
            >
              <Plus size={13} />
              Nueva rutina
            </button>
          </div>

          {routines.length === 0 ? (
            <div className="py-12 text-center">
              <Dumbbell size={32} className="mx-auto mb-3 text-[var(--text-muted)]/30" />
              <p className="text-sm text-[var(--text-muted)]">No tenés rutinas guardadas</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]/60">Creá tu primera rutina de entrenamiento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {routines.map(routine => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onDelete={deleteRoutine}
                  onLog={handleLogRoutine}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* CUERPO */}
      {activeSection === 'cuerpo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              {records.length} registro{records.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setShowBodyForm(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#22d3ee] px-3 py-2 text-xs font-medium text-[#0a0a0f] transition-colors hover:bg-[#06b6d4]"
            >
              <Plus size={13} />
              Nueva medición
            </button>
          </div>

          <div
            className="lumus-glass rounded-xl p-4"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="mb-4 text-[0.6rem] uppercase tracking-wider text-[var(--text-muted)]">Evolución del peso</p>
            <BodyProgressChart
              records={records}
              latestWeight={latestWeight}
              weightTrend={weightTrend}
            />
          </div>

          {records.length > 0 && (
            <div
              className="lumus-glass rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[0.6rem] uppercase tracking-wider text-[var(--text-muted)]">Historial</p>
              </div>
              {records.slice(0, 10).map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < Math.min(records.length, 10) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {r.notes && <p className="text-xs text-[var(--text-muted)]">{r.notes}</p>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    {r.weight_kg != null && (
                      <span className="font-semibold text-[var(--text-primary)]">{r.weight_kg} kg</span>
                    )}
                    {r.body_fat_pct != null && <span>{r.body_fat_pct}% grasa</span>}
                    {r.muscle_kg != null && <span>{r.muscle_kg} kg músculo</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showRoutineForm && (
        <RoutineForm
          exercises={exercises}
          onSave={createRoutine}
          onCreateExercise={createExercise}
          onClose={() => setShowRoutineForm(false)}
        />
      )}

      {showBodyForm && (
        <BodyRecordForm
          onSave={addRecord}
          onClose={() => setShowBodyForm(false)}
        />
      )}

      {showSessionForm && (
        <SessionLogForm
          date={today}
          routines={routines}
          onSave={async (data) => {
            if (sessionRoutine && !data.routine_id) {
              data.routine_id = sessionRoutine.id
            }
            return logSession(data)
          }}
          onClose={() => { setShowSessionForm(false); setSessionRoutine(null) }}
        />
      )}

      {showLumus && (
        <LumusChat
          module="fit"
          moduleLabel="Fit & Salud"
          suggestions={LUMUS_SUGGESTIONS}
          onClose={() => setShowLumus(false)}
        />
      )}
    </div>
  )
}
