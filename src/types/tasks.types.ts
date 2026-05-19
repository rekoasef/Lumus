export type TaskPriority = 'alta' | 'media' | 'baja'
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  start_time: string | null
  duration_minutes: number | null
  parent_id: string | null
  routine_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  subtasks?: Task[]
}

export interface TaskLabel {
  id: string
  user_id: string
  name: string
  color: string
}

export type TaskFilter = {
  status: TaskStatus | 'todas'
  priority: TaskPriority | 'todas'
}
