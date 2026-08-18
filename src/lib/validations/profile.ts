import { z } from 'zod'

// ——— Profile ———

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  occupation: z.string().max(100).nullable().optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').nullable().optional(),
  monthly_salary: z.number().min(0).nullable().optional(),
  life_summary: z.string().max(4000).nullable().optional(),
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
