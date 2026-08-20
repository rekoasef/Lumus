import { z } from 'zod'

export const FEEDBACK_KINDS = ['bug', 'mejora', 'otro'] as const

/** El límite de 2000 coincide con el CHECK de la tabla (migración 00019). */
export const createFeedbackSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z
    .string()
    .trim()
    .min(1, 'Contanos qué pasó')
    .max(2000, 'Máximo 2000 caracteres'),
  path: z.string().max(300).nullable().optional(),
})

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>
