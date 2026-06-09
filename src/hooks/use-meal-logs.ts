'use client'

import { useState } from 'react'
import type { MealLog, MealType } from '@/types/food.types'
import type { CreateMealLogInput } from '@/lib/validations/food'

export function useMealLogs(initialLogs: MealLog[]) {
  const [logs, setLogs] = useState<MealLog[]>(initialLogs)

  function getTodayLogs(date: string): MealLog[] {
    return logs.filter(l => l.date === date)
  }

  function getCaloriesForDate(date: string): number {
    return getTodayLogs(date).reduce((sum, l) => sum + (l.calories ?? 0), 0)
  }

  function getProteinForDate(date: string): number {
    return getTodayLogs(date).reduce((sum, l) => sum + (l.protein_g ?? 0), 0)
  }

  function getLogsByMealType(date: string): Record<MealType, MealLog[]> {
    const todayLogs = getTodayLogs(date)
    return {
      desayuno: todayLogs.filter(l => l.meal_type === 'desayuno'),
      almuerzo: todayLogs.filter(l => l.meal_type === 'almuerzo'),
      merienda: todayLogs.filter(l => l.meal_type === 'merienda'),
      cena:     todayLogs.filter(l => l.meal_type === 'cena'),
    }
  }

  async function addLog(input: CreateMealLogInput): Promise<boolean> {
    const res = await fetch('/api/food/meal-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return false
    const { meal_log } = await res.json() as { meal_log: MealLog }
    setLogs(prev => [meal_log, ...prev])
    return true
  }

  async function deleteLog(id: string): Promise<boolean> {
    const res = await fetch(`/api/food/meal-logs/${id}`, { method: 'DELETE' })
    if (!res.ok) return false
    setLogs(prev => prev.filter(l => l.id !== id))
    return true
  }

  return { logs, getTodayLogs, getCaloriesForDate, getProteinForDate, getLogsByMealType, addLog, deleteLog }
}
