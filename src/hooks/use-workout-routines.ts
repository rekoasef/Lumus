'use client'

import { useState } from 'react'
import type { WorkoutRoutine, WorkoutExercise } from '@/types/fit.types'
import type { CreateRoutineInput } from '@/lib/validations/fit'

export function useWorkoutRoutines(initialRoutines: WorkoutRoutine[], initialExercises: WorkoutExercise[]) {
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(initialRoutines)
  const [exercises, setExercises] = useState<WorkoutExercise[]>(initialExercises)

  async function createRoutine(input: CreateRoutineInput): Promise<boolean> {
    const res = await fetch('/api/fit/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return false
    const { routine } = await res.json() as { routine: WorkoutRoutine }
    setRoutines(prev => [routine, ...prev])
    return true
  }

  async function deleteRoutine(id: string): Promise<boolean> {
    const res = await fetch(`/api/fit/routines/${id}`, { method: 'DELETE' })
    if (!res.ok) return false
    setRoutines(prev => prev.filter(r => r.id !== id))
    return true
  }

  async function createExercise(name: string, muscle_group?: string): Promise<WorkoutExercise | null> {
    const res = await fetch('/api/fit/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, muscle_group: muscle_group ?? null }),
    })
    if (!res.ok) return null
    const { exercise } = await res.json() as { exercise: WorkoutExercise }
    setExercises(prev => [...prev, exercise].sort((a, b) => a.name.localeCompare(b.name)))
    return exercise
  }

  return { routines, exercises, createRoutine, deleteRoutine, createExercise }
}
