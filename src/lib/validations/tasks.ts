import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  priority: z.enum(['alta', 'media', 'baja']),
  due_date: z.string().nullable().optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM').nullable().optional(),
  duration_minutes: z.number().int().min(5).max(480).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  repeat_type: z.enum(['daily', 'weekly', 'weekdays', 'monthly']).nullable().optional(),
  repeat_days: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  repeat_end_date: z.string().nullable().optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  priority: z.enum(['alta', 'media', 'baja']).optional(),
  status: z.enum(['pendiente', 'en_progreso', 'completada']).optional(),
  due_date: z.string().nullable().optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  duration_minutes: z.number().int().min(5).max(480).nullable().optional(),
  repeat_type: z.enum(['daily', 'weekly', 'weekdays', 'monthly']).nullable().optional(),
  repeat_days: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  repeat_end_date: z.string().nullable().optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
