export type WorkoutGoal = 'hipertrofia' | 'fuerza' | 'definicion' | 'cardio'
export type MuscleGroup = 'pecho' | 'espalda' | 'piernas' | 'hombros' | 'brazos' | 'abdomen' | 'cardio' | 'full_body'

export interface BodyRecord {
  id: string
  user_id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_kg: number | null
  notes: string | null
  photo_url: string | null
  created_at: string
}

export interface WorkoutExercise {
  id: string
  user_id: string
  name: string
  muscle_group: MuscleGroup | null
  description: string | null
  is_default: boolean | null
}

export interface WorkoutRoutineExercise {
  id: string
  routine_id: string
  exercise_id: string
  sets: number | null
  reps: number | null
  rest_seconds: number | null
  order_index: number
  exercise?: Pick<WorkoutExercise, 'id' | 'name' | 'muscle_group'>
}

export interface WorkoutRoutine {
  id: string
  user_id: string
  name: string
  description: string | null
  goal: WorkoutGoal | null
  ai_generated: boolean | null
  created_at: string
  updated_at: string
  exercises?: WorkoutRoutineExercise[]
}

export interface WorkoutSession {
  id: string
  user_id: string
  routine_id: string | null
  date: string
  duration_min: number | null
  notes: string | null
  completed: boolean | null
  created_at: string
  routine?: Pick<WorkoutRoutine, 'id' | 'name' | 'goal'>
}

export interface HealthLog {
  id: string
  user_id: string
  date: string
  water_ml: number | null
  sleep_hours: number | null
  steps: number | null
  created_at: string
}
