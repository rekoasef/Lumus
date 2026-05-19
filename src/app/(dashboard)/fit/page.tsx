import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FitDashboard } from '@/components/modules/fit/fit-dashboard'
import type { HealthLog, BodyRecord, WorkoutRoutine, WorkoutExercise, WorkoutSession } from '@/types/fit.types'

export default async function FitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [healthLogRes, bodyRecordsRes, routinesRes, exercisesRes, sessionsRes] = await Promise.all([
    supabase
      .from('health_logs')
      .select('id, user_id, date, water_ml, sleep_hours, steps, created_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),

    supabase
      .from('body_records')
      .select('id, user_id, date, weight_kg, body_fat_pct, muscle_kg, notes, created_at')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30),

    supabase
      .from('workout_routines')
      .select(`
        id, user_id, name, description, goal, ai_generated, created_at, updated_at,
        exercises:workout_routine_exercises(
          id, routine_id, exercise_id, sets, reps, rest_seconds, order_index,
          exercise:workout_exercises(id, name, muscle_group)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('workout_exercises')
      .select('id, user_id, name, muscle_group, description, is_default')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),

    supabase
      .from('workout_sessions')
      .select(`
        id, user_id, routine_id, date, duration_min, notes, completed, created_at,
        routine:workout_routines(id, name, goal)
      `)
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <FitDashboard
      initialHealthLog={(healthLogRes.data ?? null) as HealthLog | null}
      initialBodyRecords={(bodyRecordsRes.data ?? []) as unknown as BodyRecord[]}
      initialRoutines={(routinesRes.data ?? []) as unknown as WorkoutRoutine[]}
      initialExercises={(exercisesRes.data ?? []) as unknown as WorkoutExercise[]}
      initialSessions={(sessionsRes.data ?? []) as unknown as WorkoutSession[]}
    />
  )
}
