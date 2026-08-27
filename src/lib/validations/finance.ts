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
  to_wallet_id: z.string().uuid().nullable().optional(),
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

// ——— Saving Goals ———

export const createSavingGoalSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  target_amount: z.number().positive('El monto objetivo debe ser mayor a 0'),
  wallet_ids: z.array(z.string().uuid()).optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
})

export const updateSavingGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  target_amount: z.number().positive().optional(),
  current_amount: z.number().min(0).optional(),
  wallet_ids: z.array(z.string().uuid()).optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  achieved: z.boolean().optional(),
})

export type CreateSavingGoalInput = z.infer<typeof createSavingGoalSchema>
export type UpdateSavingGoalInput = z.infer<typeof updateSavingGoalSchema>

// ——— Recurring Transactions ———

export const createRecurringTransactionSchema = z.object({
  wallet_id:   z.string().uuid('Billetera requerida'),
  category_id: z.string().uuid().nullable().optional(),
  type:        z.enum(['gasto', 'ingreso']),
  amount:      z.number().positive('El monto debe ser mayor a 0'),
  description: z.string().max(500).nullable().optional(),
  repeat_type: z.enum(['daily', 'weekly', 'monthly']),
  repeat_day:  z.number().int().nullable().optional(),
  next_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
})

export const updateRecurringTransactionSchema = createRecurringTransactionSchema.partial().extend({
  active: z.boolean().optional(),
})

export type CreateRecurringTransactionInput = z.infer<typeof createRecurringTransactionSchema>
export type UpdateRecurringTransactionInput = z.infer<typeof updateRecurringTransactionSchema>

/** Unificar una categoría dentro de otra — ver migración 00020. */
export const mergeCategorySchema = z.object({
  target_id: z.uuid(),
})

export type MergeCategoryInput = z.infer<typeof mergeCategorySchema>

/** Query de `GET /api/finance/summary` — ver migración 00021. */
const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').nullable().optional()

export const financeSummaryQuerySchema = z.object({
  from: dateParam,
  to:   dateParam,
})

export type FinanceSummaryQuery = z.infer<typeof financeSummaryQuerySchema>

// ——— Tenencias (inversiones) — ver migración 00026 ———

/**
 * Una tenencia necesita un precio para poder valuarse: el de una fuente
 * automática (cripto) o uno cargado a mano. Sin ninguno de los dos no suma al
 * patrimonio, que es lo único que esta tabla vino a arreglar — por eso la base
 * también lo exige con un `check`.
 */
const holdingBase = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(60),
  kind: z.enum(['cripto', 'accion', 'otro']),
  price_source: z.string().max(60).nullable().optional(),
  quantity: z.number().positive('La cantidad tiene que ser mayor a cero'),
  purchase_price: z.number().min(0, 'El precio no puede ser negativo'),
  purchase_currency: z.enum(['ARS', 'USD']),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  manual_price: z.number().min(0).nullable().optional(),
})

const hasSomePrice = (data: { price_source?: string | null; manual_price?: number | null }) =>
  Boolean(data.price_source) || typeof data.manual_price === 'number'

export const createHoldingSchema = holdingBase.refine(hasSomePrice, {
  message: 'Elegí una cripto o cargá el precio actual a mano',
  path: ['manual_price'],
})

export const updateHoldingSchema = holdingBase.partial()

export type CreateHoldingInput = z.infer<typeof createHoldingSchema>
export type UpdateHoldingInput = z.infer<typeof updateHoldingSchema>
