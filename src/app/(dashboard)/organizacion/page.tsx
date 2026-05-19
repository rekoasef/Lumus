import { TerminalSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TaskList } from '@/components/modules/organizacion/task-list'
import type { Task } from '@/types/tasks.types'

async function getTasks(userId: string): Promise<Task[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select('id, title, description, priority, status, due_date, start_time, duration_minutes, parent_id, routine_id, created_at, updated_at, deleted_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
  return (data ?? []) as Task[]
}

export default async function OrganizacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const tasks = await getTasks(user.id)

  return (
    <div className="min-h-screen px-5 py-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[1120px]">
        <header className="mb-9 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="lumus-label text-[#cfc6ff]">Organización</p>
            <h1 className="lumus-heading mt-4 text-4xl font-bold text-[var(--text-primary)] md:text-5xl">
              Tareas, objetivos y rutinas
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              Gestioná tus pendientes, planificá bloques de tiempo y mantené el día bajo control.
            </p>
          </div>
          <div className="grid size-14 place-items-center rounded-2xl border border-[#bdb4ff]/20 bg-[#bdb4ff]/12 text-[#d8d1ff]">
            <TerminalSquare size={28} />
          </div>
        </header>

        <TaskList initialTasks={tasks} />
      </div>
    </div>
  )
}
