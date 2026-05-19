import { createClient } from '@/lib/supabase/server'
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  Circle,
  Cloud,
  Gauge,
  Shield,
  Sun,
  Thermometer,
  Timer,
  Wifi,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

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

function getPeriod() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
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
  { time: '15:30', label: 'Revision', active: false },
  { time: '18:00', label: 'Cierre', active: false },
]

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
  const period = getPeriod()
  const mood = moodToday ? MOOD_MAP[moodToday] : null
  const load = pendingCount === 0 ? 14 : Math.min(14 + pendingCount * 11, 92)
  const focusDuration = totalMinutesScheduled > 0 ? formatMinutes(totalMinutesScheduled) : 'Sin bloques'
  const trajectory = todayScheduled.length > 0
    ? todayScheduled.map((task, index) => ({
        time: task.start_time ?? DEFAULT_TRAJECTORY[index]?.time ?? '--:--',
        label: task.title,
        active: index === 0,
      }))
    : DEFAULT_TRAJECTORY
  const sprintTask = pendingTasks[0] ?? null

  return (
    <div className="relative min-h-screen px-5 py-8 lg:px-12 lg:py-12">
      <section className="lumus-glass relative mx-auto max-w-[1120px] overflow-hidden rounded-[2rem] px-6 py-8 md:px-12 md:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(189,180,255,0.12),transparent_20rem)]" />
        <Sun className="pointer-events-none absolute right-9 top-12 hidden text-[#bdb4ff]/25 md:block" size={134} strokeWidth={1.5} />

        <div className="relative">
          <div className="mb-6 flex items-center gap-3">
            <span className="size-3 rounded-full bg-[#bdb4ff] shadow-[0_0_18px_rgba(189,180,255,0.9)]" />
            <span className="lumus-label text-[#d6d0ff]">Armonía diaria</span>
          </div>

          <h1 className="lumus-heading max-w-4xl text-4xl font-bold leading-tight text-[var(--text-primary)] md:text-5xl">
            Buenos {period === 'morning' ? 'días' : period === 'afternoon' ? 'tardes' : 'noches'}, {firstName}. Tu sistema está listo para{' '}
            <em className="font-semibold text-[#bdb4ff]">trabajo profundo</em>.
          </h1>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                label: 'Carga cognitiva',
                value: `Óptima (${load}%)`,
                note: `${pendingCount} tareas activas`,
                icon: Brain,
                accent: '#bdb4ff',
                bar: load,
              },
              {
                label: 'Ritmo del día',
                value: 'Estable',
                note: mood ? `Estado: ${mood.label}` : 'Sin estado registrado hoy',
                icon: Thermometer,
                accent: '#ffb86e',
                bar: 64,
              },
              {
                label: 'Tiempo enfocado',
                value: focusDuration,
                note: todayScheduled.length > 0 ? `${todayScheduled.length} bloques planificados` : 'Sin bloques agendados',
                icon: Timer,
                accent: '#d8d1ff',
                bar: 72,
              },
            ].map(({ label, value, note, icon: Icon, accent, bar }) => (
              <div key={label} className="rounded-3xl border border-white/[0.065] bg-white/[0.035] p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="lumus-heading text-lg font-semibold uppercase leading-tight text-[var(--text-secondary)]">
                      {label}
                    </p>
                    <p className="lumus-heading mt-1 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
                  </div>
                  <Icon size={23} style={{ color: accent }} />
                </div>
                <p className="mt-6 text-sm font-medium text-[var(--text-secondary)]">{note}</p>
                <div className="mt-5 h-1 rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${bar}%`, backgroundColor: accent, boxShadow: `0 0 18px ${accent}80` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-[1120px] gap-6 xl:grid-cols-[360px_1fr]">
        <div className="lumus-glass flex min-h-[305px] flex-col justify-between rounded-3xl p-8">
          <div>
            <p className="lumus-label text-[#d8d1ff]">Sugerencia</p>
            <p className="lumus-heading mt-7 text-lg font-semibold leading-8 text-[var(--text-primary)]">
              Revisá tus tareas pendientes antes de planificar nuevos bloques. Lumus prioriza lo urgente y deja espacio para trabajo profundo.
            </p>
          </div>
          <Link
            href="/organizacion"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#bdb4ff] px-8 text-sm font-bold uppercase text-[#190f5d] transition hover:bg-[#d8d1ff]"
            style={{ letterSpacing: '0.12em' }}
          >
            Ajustar agenda
          </Link>
        </div>

        <div className="lumus-glass rounded-3xl p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="lumus-heading text-2xl font-semibold text-[var(--text-primary)]">Trayectoria diaria</h2>
            <div className="hidden gap-9 text-sm font-bold uppercase text-[var(--text-secondary)] sm:flex">
              <span>Hoy</span>
              <span>Proyeccion</span>
            </div>
          </div>

          <div className="relative mt-20 pb-8">
            <svg className="absolute inset-x-0 top-0 h-20 w-full overflow-visible" viewBox="0 0 640 90" preserveAspectRatio="none" aria-hidden>
              <path d="M0 62 C120 22 220 36 316 26 C430 16 512 60 640 74" fill="none" stroke="rgba(189,180,255,0.38)" strokeWidth="2" strokeDasharray="12 10" />
              <path d="M0 70 L640 70" stroke="rgba(255,255,255,0.11)" strokeWidth="1" />
            </svg>
            <div className="relative grid grid-cols-5">
              {trajectory.map((point, index) => (
                <div key={`${point.time}-${index}`} className="flex flex-col items-center">
                  <span
                    className={`size-4 rounded-full border-2 ${point.active ? 'bg-[#d7d0ff]' : 'bg-[#15141d]'}`}
                    style={{
                      borderColor: point.active ? '#d7d0ff' : 'rgba(189,180,255,0.55)',
                      boxShadow: point.active ? '0 0 24px rgba(189,180,255,0.95)' : 'none',
                    }}
                  />
                  <span className="mt-6 text-base font-semibold text-[#c9c2ee]">{point.time}</span>
                  <span className="mt-1 max-w-24 truncate text-xs text-[var(--text-muted)]">{point.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-[1120px] gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="lumus-glass rounded-3xl p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="lumus-label text-[#d8d1ff]">Tareas activas</p>
            <Link href="/organizacion" className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Abrir tareas <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {pendingTasks.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-6 text-center">
                <CheckCircle2 className="mx-auto mb-3 text-[#bdb4ff]" size={28} />
                <p className="text-sm text-[var(--text-secondary)]">No hay tareas pendientes.</p>
              </div>
            ) : (
              pendingTasks.map(task => {
                const accent = PRIORITY_ACCENT[task.priority as string] ?? '#bdb4ff'
                return (
                  <div key={task.id} className="flex items-center gap-4 rounded-2xl border border-white/[0.055] bg-white/[0.035] px-4 py-3">
                    <Circle size={15} style={{ color: accent, flexShrink: 0 }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{task.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{task.start_time ?? 'Sin horario'}</p>
                    </div>
                    <span className="size-2 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }} />
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="lumus-glass rounded-3xl p-7">
            <div className="flex items-center gap-5">
              <div className="size-[4.5rem] overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0b0b12,#bdb4ff,#ff4fd8,#0c7cff)]" />
              <div>
                <p className="lumus-label text-[#d8d1ff]">Foco actual</p>
                <p className="lumus-heading mt-3 text-lg font-semibold text-[var(--text-primary)]">
                  {sprintTask?.title ?? 'Sin tarea activa'}
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--text-secondary)]">
                  {completedToday > 0 ? `${completedToday} completadas hoy` : 'Listo para planificar'}
                </p>
              </div>
            </div>
          </div>

          <div className="lumus-glass rounded-3xl p-7">
            <div className="flex items-center gap-5">
              <div className="grid size-[4.5rem] place-items-center rounded-2xl bg-white/[0.14] text-[var(--text-secondary)]">
                <Activity size={32} />
              </div>
              <div>
                <p className="lumus-label text-[#ffb86e]">Estado del sistema</p>
                <p className="lumus-heading mt-3 text-lg font-semibold text-[var(--text-primary)]">Lumus activo</p>
                <p className="mt-1 text-base font-semibold text-[var(--text-secondary)]">Datos sincronizados</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-[1120px]">
        <p className="lumus-label mb-8 text-center text-[var(--text-secondary)]">Servicios auxiliares</p>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Conexión', value: 'Activa', icon: Gauge, color: '#bdb4ff' },
            { label: 'Ambiente', value: 'Estable', icon: Wifi, color: '#ffb86e' },
            { label: 'Seguridad', value: 'Correcta', icon: Shield, color: '#d8d1ff' },
            { label: 'Sincronización', value: habits.length > 0 ? `${habits.length} hábitos` : 'En tiempo real', icon: Cloud, color: '#bdb4ff' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="lumus-glass rounded-3xl p-7">
              <Icon size={25} style={{ color }} />
              <p className="lumus-heading mt-10 text-lg font-semibold text-[var(--text-primary)]">{label}</p>
              <div className="mt-6 flex items-end justify-between gap-4">
                <p className="text-base font-medium text-[var(--text-secondary)]">{value}</p>
                <span className="size-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto mt-10 max-w-[1120px] rounded-full border border-white/[0.05] bg-white/[0.025] px-5 py-4">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          {[
            { label: 'Completadas hoy', value: completedToday.toString(), icon: Zap },
            { label: 'Hábitos', value: `${habits.length} activos`, icon: Activity },
            { label: 'Agendadas', value: todayScheduled.length.toString(), icon: Timer },
            { label: 'Estado', value: mood?.label ?? 'Sin registrar', icon: Brain },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="text-[#bdb4ff]" size={16} />
              <div>
                <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{label}</p>
                <p className="mt-1 font-semibold text-[var(--text-secondary)]">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
