import { z } from 'zod'

const ingredientSchema = z.object({
  name:     z.string().min(1),
  quantity: z.string(),
  unit:     z.string(),
})

export const createRecipeSchema = z.object({
  title:        z.string().min(1, 'El título es requerido').max(200),
  description:  z.string().max(500).nullable().optional(),
  ingredients:  z.array(ingredientSchema).nullable().optional(),
  instructions: z.string().nullable().optional(),
  calories:     z.number().int().nonnegative().nullable().optional(),
  protein_g:    z.number().nonnegative().nullable().optional(),
  carbs_g:      z.number().nonnegative().nullable().optional(),
  fat_g:        z.number().nonnegative().nullable().optional(),
  prep_time_min: z.number().int().nonnegative().nullable().optional(),
})

export const updateRecipeSchema = createRecipeSchema.partial().extend({
  favorite: z.boolean().optional(),
})

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>

export const createMealLogSchema = z.object({
  recipe_id:  z.string().uuid().nullable().optional(),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_type:  z.enum(['desayuno', 'almuerzo', 'merienda', 'cena']),
  name:       z.string().max(200).nullable().optional(),
  calories:   z.number().int().nonnegative().nullable().optional(),
  notes:      z.string().max(500).nullable().optional(),
})

export type CreateMealLogInput = z.infer<typeof createMealLogSchema>

export const createShoppingItemSchema = z.object({
  name:     z.string().min(1, 'El nombre es requerido').max(200),
  quantity: z.string().max(50).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
})

export type CreateShoppingItemInput = z.infer<typeof createShoppingItemSchema>
