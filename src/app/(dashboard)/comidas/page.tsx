import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ComidasDashboard } from '@/components/modules/comidas/comidas-dashboard'
import type { Recipe, MealLog, ShoppingListItem } from '@/types/food.types'

export default async function ComidasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [recipesRes, mealLogsRes, shoppingRes] = await Promise.all([
    supabase
      .from('recipes')
      .select('id, title, description, ingredients, instructions, calories, protein_g, carbs_g, fat_g, prep_time_min, ai_generated, favorite, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),

    supabase
      .from('meal_logs')
      .select('id, user_id, recipe_id, date, meal_type, name, calories, notes, created_at, recipe:recipes(id, title, calories)')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo)
      .lte('date', today)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),

    supabase
      .from('shopping_list_items')
      .select('id, user_id, name, quantity, category, checked, auto_added, created_at')
      .eq('user_id', user.id)
      .order('category', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  return (
    <ComidasDashboard
      initialRecipes={(recipesRes.data ?? []) as Recipe[]}
      initialMealLogs={(mealLogsRes.data ?? []) as MealLog[]}
      initialShoppingItems={(shoppingRes.data ?? []) as unknown as ShoppingListItem[]}
    />
  )
}
