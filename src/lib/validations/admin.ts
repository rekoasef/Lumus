import { z } from 'zod'

/** Mismos topes que los CHECK de `beta_invites` (migración 00031). */
export const MAX_ACCESS_DAYS = 730
export const MAX_GRANT_REASON = 80

export const FEEDBACK_STATUSES = ['nuevo', 'visto', 'resuelto'] as const

const reasonSchema = z
  .string()
  .trim()
  .min(1, 'Poné un motivo')
  .max(MAX_GRANT_REASON, `Máximo ${MAX_GRANT_REASON} caracteres`)

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Mail inválido'),
  reason: reasonSchema,
  /** null = sin vencimiento */
  accessDays: z.number().int().min(1).max(MAX_ACCESS_DAYS).nullable(),
})

export const setGrantSchema = z.object({
  reason: reasonSchema,
  /** null = sin vencimiento. Tiene que ser futuro: un grant vencido de entrada es un bloqueo disfrazado. */
  expiresAt: z
    .string()
    .datetime({ offset: true })
    .refine(value => new Date(value).getTime() > Date.now(), 'El vencimiento tiene que ser a futuro')
    .nullable(),
})

export const feedbackStatusSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES),
})

export const uuidSchema = z.string().uuid()

export type InviteInput = z.infer<typeof inviteSchema>
export type SetGrantInput = z.infer<typeof setGrantSchema>
export type FeedbackStatusInput = z.infer<typeof feedbackStatusSchema>
