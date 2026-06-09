export type MealType = 'desayuno' | 'almuerzo' | 'merienda' | 'cena'

export type RecipeCategory = 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'postre' | 'otro'

export type ActivityLevel = 'sedentario' | 'moderado' | 'activo' | 'muy_activo'

export interface RecipeIngredient {
  name: string
  quantity: string
  unit: string
}

export interface Recipe {
  id: string
  user_id: string
  title: string
  description: string | null
  ingredients: RecipeIngredient[] | null
  instructions: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  prep_time_min: number | null
  servings: number
  category: RecipeCategory
  ai_generated: boolean
  favorite: boolean
  created_at: string
  updated_at: string
}

export interface MealLog {
  id: string
  user_id: string
  recipe_id: string | null
  date: string
  meal_type: MealType
  name: string | null
  calories: number | null
  protein_g: number | null
  photo_url: string | null
  notes: string | null
  created_at: string
  recipe?: Pick<Recipe, 'id' | 'title' | 'calories'>
}

export interface ShoppingListItem {
  id: string
  user_id: string
  name: string
  quantity: string | null
  category: string | null
  checked: boolean
  auto_added: boolean
  created_at: string
}

export interface NutritionGoals {
  daily_calorie_goal: number | null
  daily_protein_goal: number | null
  activity_level: ActivityLevel
  trains: boolean
  weight_kg: number | null
  height_cm: number | null
}

export interface FoodAnalysis {
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence: 'alta' | 'media' | 'baja'
  notes: string | null
}

export interface DailyNutritionSummary {
  date: string
  total_calories: number
  total_protein_g: number
  by_meal: Record<MealType, { calories: number; protein_g: number }>
  goal_calories: number | null
  goal_protein_g: number | null
}
