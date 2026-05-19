import { z } from 'zod'

export const upsertHealthLogSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  water_ml:    z.number().int().nonnegative().nullable().optional(),
  sleep_hours: z.number().nonnegative().max(24).nullable().optional(),
  steps:       z.number().int().nonnegative().nullable().optional(),
})

export type UpsertHealthLogInput = z.infer<typeof upsertHealthLogSchema>

export const createBodyRecordSchema = z.object({
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg:     z.number().nonnegative().nullable().optional(),
  body_fat_pct:  z.number().nonnegative().max(100).nullable().optional(),
  muscle_kg:     z.number().nonnegative().nullable().optional(),
  notes:         z.string().max(500).nullable().optional(),
})

export type CreateBodyRecordInput = z.infer<typeof createBodyRecordSchema>

const routineExerciseSchema = z.object({
  exercise_id:  z.string().uuid(),
  sets:         z.number().int().positive().nullable().optional(),
  reps:         z.number().int().positive().nullable().optional(),
  rest_seconds: z.number().int().nonnegative().nullable().optional(),
  order_index:  z.number().int().nonnegative().default(0),
})

export const createRoutineSchema = z.object({
  name:        z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().max(500).nullable().optional(),
  goal:        z.enum(['hipertrofia', 'fuerza', 'definicion', 'cardio']).nullable().optional(),
  exercises:   z.array(routineExerciseSchema).optional(),
})

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>

export const createExerciseSchema = z.object({
  name:         z.string().min(1, 'El nombre es requerido').max(200),
  muscle_group: z.enum(['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'abdomen', 'cardio', 'full_body']).nullable().optional(),
  description:  z.string().max(500).nullable().optional(),
})

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>

export const createSessionSchema = z.object({
  routine_id:   z.string().uuid().nullable().optional(),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_min: z.number().int().positive().nullable().optional(),
  notes:        z.string().max(500).nullable().optional(),
  completed:    z.boolean().default(true),
})

export type CreateSessionInput = z.infer<typeof createSessionSchema>
