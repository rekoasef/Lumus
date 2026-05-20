import { z } from 'zod'

// ——— Wallets ———

export const createWalletSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  type: z.enum(['efectivo', 'banco', 'virtual']),
  balance: z.number().min(0),
  currency: z.string().length(3),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().max(50).nullable().optional(),
})

export const updateWalletSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['efectivo', 'banco', 'virtual']).optional(),
  currency: z.string().length(3).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(50).nullable().optional(),
})

export type CreateWalletInput = z.infer<typeof createWalletSchema>
export type UpdateWalletInput = z.infer<typeof updateWalletSchema>

// ——— Finance Categories ———

export const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  type: z.enum(['gasto', 'ingreso']),
  icon: z.string().max(50).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['gasto', 'ingreso']).optional(),
  icon: z.string().max(50).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

// ——— Transactions ———

export const createTransactionSchema = z.object({
  wallet_id: z.string().uuid('Billetera requerida'),
  category_id: z.string().uuid().nullable().optional(),
  type: z.enum(['gasto', 'ingreso', 'transferencia']),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  description: z.string().max(500).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
})

export const updateTransactionSchema = z.object({
  wallet_id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  type: z.enum(['gasto', 'ingreso', 'transferencia']).optional(),
  amount: z.number().positive().optional(),
  description: z.string().max(500).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>

// ——— Budgets ———

export const createBudgetSchema = z.object({
  category_id: z.string().uuid('Categoría requerida'),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
})

export const updateBudgetSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0').optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
})

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>

// ——— Subscriptions ———

export const createSubscriptionSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  amount: z.number().min(0, 'El monto no puede ser negativo'),
  currency: z.string().length(3),
  billing_cycle: z.enum(['mensual', 'anual', 'semanal']),
  variable: z.boolean(),
  wallet_id: z.string().uuid().nullable().optional(),
  next_billing: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
})

export const updateSubscriptionSchema = createSubscriptionSchema.partial().extend({
  active: z.boolean().optional(),
})

export const paySubscriptionSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0'),
  category_id: z.string().uuid().nullable().optional(),
  wallet_id: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type PaySubscriptionInput = z.infer<typeof paySubscriptionSchema>

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>

// ——— Saving Goals ———

export const createSavingGoalSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  target_amount: z.number().positive('El monto objetivo debe ser mayor a 0'),
  wallet_id: z.string().uuid().nullable().optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
})

export const updateSavingGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  target_amount: z.number().positive().optional(),
  current_amount: z.number().min(0).optional(),
  wallet_id: z.string().uuid().nullable().optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  achieved: z.boolean().optional(),
})

export type CreateSavingGoalInput = z.infer<typeof createSavingGoalSchema>
export type UpdateSavingGoalInput = z.infer<typeof updateSavingGoalSchema>
