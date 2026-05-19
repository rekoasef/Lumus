'use client'

import { useState } from 'react'
import type { Recipe } from '@/types/food.types'
import type { CreateRecipeInput, UpdateRecipeInput } from '@/lib/validations/food'

export function useRecipes(initialRecipes: Recipe[]) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [isGenerating, setIsGenerating] = useState(false)

  async function createRecipe(input: CreateRecipeInput & { ai_generated?: boolean }): Promise<boolean> {
    const res = await fetch('/api/food/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return false
    const { recipe } = await res.json() as { recipe: Recipe }
    setRecipes(prev => [recipe, ...prev])
    return true
  }

  async function updateRecipe(id: string, input: UpdateRecipeInput): Promise<boolean> {
    const res = await fetch(`/api/food/recipes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return false
    const { recipe } = await res.json() as { recipe: Recipe }
    setRecipes(prev => prev.map(r => r.id === id ? recipe : r))
    return true
  }

  async function deleteRecipe(id: string): Promise<boolean> {
    const res = await fetch(`/api/food/recipes/${id}`, { method: 'DELETE' })
    if (!res.ok) return false
    setRecipes(prev => prev.filter(r => r.id !== id))
    return true
  }

  async function toggleFavorite(id: string): Promise<boolean> {
    const recipe = recipes.find(r => r.id === id)
    if (!recipe) return false
    return updateRecipe(id, { favorite: !recipe.favorite })
  }

  async function generateRecipe(prompt: string): Promise<Recipe | null> {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/food/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) return null
      const generated = await res.json()

      const createRes = await fetch('/api/food/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...generated, ai_generated: true }),
      })
      if (!createRes.ok) return null
      const { recipe } = await createRes.json() as { recipe: Recipe }
      setRecipes(prev => [recipe, ...prev])
      return recipe
    } finally {
      setIsGenerating(false)
    }
  }

  return { recipes, isGenerating, createRecipe, updateRecipe, deleteRecipe, toggleFavorite, generateRecipe }
}
