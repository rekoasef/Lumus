import { z } from 'zod'

// ——— Profile ———

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  monthly_salary: z.number().min(0).nullable().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

// ——— Cambio de contraseña ———

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Ingresá tu contraseña actual'),
  new_password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string().min(8, 'Mínimo 8 caracteres'),
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/** Frase que hay que escribir para eliminar la cuenta: frena el toque sin querer. */
export const DELETE_ACCOUNT_PHRASE = 'ELIMINAR'

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Ingresá tu contraseña'),
  confirmation: z.literal(DELETE_ACCOUNT_PHRASE, { error: `Escribí ${DELETE_ACCOUNT_PHRASE} para confirmar` }),
})

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
