import { createClient } from '@/lib/supabase/server'
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Circle,
  Timer,
  Zap,
  Activity,
} from 'lucide-react'
import Link from 'next/link'
import { DashboardHero } from '@/components/modules/dashboard/dashboard-hero'

async function getDashboardData(userId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: pendingTasks, count: pendingCount },
    { data: todayScheduled },
    { data: habits },
    { data: moodToday },
    { count: completedToday },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, priority, status, due_date, start_time', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'pendiente')
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('tasks')
      .select('id, title, priority, status, start_time, duration_minutes')
      .eq('user_id', userId)
      .eq('due_date', today)
      .not('start_time', 'is', null)
      .is('deleted_at', null)
      .order('start_time', { ascending: true })
      .limit(5),
    supabase
      .from('habits')
      .select('id, name, color')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(6),
    supabase
      .from('mood_logs')
      .select('mood')
      .eq('user_id', userId)
      .eq('date', today)
      .single(),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completada')
      .gte('updated_at', today)
      .is('deleted_at', null),
  ])

  const totalMinutesScheduled = (todayScheduled ?? []).reduce(
    (acc, task) => acc + (task.duration_minutes ?? 0),
    0
  )

  return {
    pendingTasks: pendingTasks ?? [],
    pendingCount: pendingCount ?? 0,
    todayScheduled: todayScheduled ?? [],
    habits: habits ?? [],
    moodToday: moodToday?.mood ?? null,
    completedToday: completedToday ?? 0,
    totalMinutesScheduled,
  }
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const MOOD_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Bajo', color: '#ef4444' },
  2: { label: 'Pesado', color: '#f97316' },
  3: { label: 'Neutral', color: '#ffb86e' },
  4: { label: 'Estable', color: '#22c55e' },
  5: { label: 'Elevado', color: '#bdb4ff' },
}

const PRIORITY_ACCENT: Record<string, string> = {
  alta: '#ef4444',
  media: '#bdb4ff',
  baja: '#22c55e',
}

const DEFAULT_TRAJECTORY = [
  { time: '08:00', label: 'Inicio', active: true },
  { time: '10:30', label: 'Trabajo profundo', active: false },
  { time: '13:00', label: 'Pausa', active: false },
  { time: '15:30', label: 'Revisión', active: false },
  { time: '18:00', label: 'Cierre', active: false },
]

function getFormattedDate(): string {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('name')
    .eq('user_id', user.id)
    .single()

  const {
    pendingTasks,
    pendingCount,
    todayScheduled,
    habits,
    moodToday,
    completedToday,
    totalMinutesScheduled,
  } = await getDashboardData(user.id)

  const firstName = (profile?.name ?? 'Usuario').split(' ')[0]
  const mood = moodToday ? MOOD_MAP[moodToday] : null
  const focusDuration = totalMinutesScheduled > 0 ? formatMinutes(totalMinutesScheduled) : null
  const sprintTask = pendingTasks[0] ?? null
  const date = getFormattedDate()

  const trajectory = todayScheduled.length > 0
    ? todayScheduled.map((task, index) => ({
        time: task.start_time ?? DEFAULT_TRAJECTORY[index]?.time ?? '--:--',
        label: task.title,
        active: index === 0,
      }))
    : DEFAULT_TRAJECTORY

  return (
    <div className="relative min-h-screen px-5 py-8 lg:px-12 lg:py-12 space-y-6">

      {/* Hero — Lumus + clock + weather + currencies */}
      <DashboardHero firstName={firstName} date={date} />

      {/* Stats bar */}
      <div className="mx-auto max-w-[1120px] rounded-2xl border border-white/[0.05] bg-white/[0.025] px-5 py-4">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          {[
            { label: 'Completadas hoy', value: completedToday.toString(), icon: Zap, color: '#bdb4ff' },
            { label: 'Hábitos activos', value: `${habits.length}`, icon: Activity, color: '#22c55e' },
            { label: 'Bloques agendados', value: todayScheduled.length > 0 ? `${todayScheduled.length}` : '0', icon: Timer, color: '#06b6d4' },
            { label: 'Estado de ánimo', value: mood?.label ?? 'Sin registrar', icon: Brain, color: mood?.color ?? '#bdb4ff' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon size={16} style={{ color }} />
              <div>
                <p className="text-[0.58rem] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
                <p className="mt-0.5 font-semibold text-[var(--text-secondary)]">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid — tasks + trajectory */}
      <div className="mx-auto grid max-w-[1120px] gap-6 xl:grid-cols-[360px_1fr]">

        {/* Tareas activas */}
        <div className="lumus-glass rounded-3xl p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[0.6rem] uppercase tracking-wider text-[var(--text-muted)]">Tareas activas</p>
            <Link
              href="/organizacion"
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>

          <div className="mt-5 space-y-2.5">
            {pendingTasks.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-6 text-center">
                <CheckCircle2 className="mx-auto mb-3 text-[#bdb4ff]" size={24} />
                <p className="text-sm text-[var(--text-secondary)]">Sin tareas pendientes</p>
              </div>
            ) : (
              pendingTasks.map(task => {
                const accent = PRIORITY_ACCENT[task.priority as string] ?? '#bdb4ff'
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.035] px-4 py-3"
                  >
                    <Circle size={13} style={{ color: accent, flexShrink: 0 }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{task.title}</p>
                      {task.start_time && (
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{task.start_time}</p>
                      )}
                    </div>
                    <span
                      className="size-1.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
                    />
                  </div>
                )
              })
            )}
          </div>

          {/* Foco actual */}
          {sprintTask && (
            <div
              className="mt-4 rounded-xl px-4 py-3"
              style={{ background: 'rgba(124,109,250,0.08)', border: '1px solid rgba(124,109,250,0.15)' }}
            >
              <p className="text-[0.55rem] uppercase tracking-wider text-[var(--text-muted)]">Próximo foco</p>
              <p className="mt-1 text-sm font-semibold text-[#bdb4ff]">{sprintTask.title}</p>
            </div>
          )}
        </div>

        {/* Trayectoria diaria */}
        <div className="lumus-glass rounded-3xl p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Trayectoria del día</h2>
              {focusDuration && (
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{focusDuration} planificados</p>
              )}
            </div>
            <Link href="/organizacion" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Editar
            </Link>
          </div>

          <div className="relative mt-16 pb-6">
            <svg
              className="absolute inset-x-0 top-0 h-16 w-full overflow-visible"
              viewBox="0 0 640 70"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M0 48 C120 18 220 28 316 20 C430 12 512 46 640 56"
                fill="none"
                stroke="rgba(189,180,255,0.3)"
                strokeWidth="1.5"
                strokeDasharray="10 8"
              />
              <path d="M0 56 L640 56" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            </svg>

            <div className="relative grid grid-cols-5">
              {trajectory.map((point, index) => (
                <div key={`${point.time}-${index}`} className="flex flex-col items-center">
                  <span
                    className="size-3.5 rounded-full border-2"
                    style={{
                      borderColor: point.active ? '#d7d0ff' : 'rgba(189,180,255,0.4)',
                      backgroundColor: point.active ? '#d7d0ff' : '#0f0f18',
                      boxShadow: point.active ? '0 0 18px rgba(215,208,255,0.9)' : 'none',
                    }}
                  />
                  <span className="mt-5 text-sm font-semibold text-[#c9c2ee]">{point.time}</span>
                  <span className="mt-0.5 max-w-20 truncate text-center text-xs text-[var(--text-muted)]">
                    {point.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hábitos */}
      {habits.length > 0 && (
        <div className="mx-auto max-w-[1120px]">
          <div className="lumus-glass rounded-3xl p-7">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[0.6rem] uppercase tracking-wider text-[var(--text-muted)]">Hábitos activos</p>
              <Link
                href="/habitos"
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Ver hábitos <ArrowRight size={12} />
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {habits.map(habit => (
                <div
                  key={habit.id}
                  className="flex items-center gap-2 rounded-full px-3 py-1.5"
                  style={{
                    background: `${habit.color ?? '#7c6dfa'}14`,
                    border: `1px solid ${habit.color ?? '#7c6dfa'}28`,
                  }}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor: habit.color ?? '#7c6dfa',
                      boxShadow: `0 0 6px ${habit.color ?? '#7c6dfa'}`,
                    }}
                  />
                  <span className="text-xs text-[var(--text-secondary)]">{habit.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
