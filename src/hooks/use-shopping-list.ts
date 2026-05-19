'use client'

import { useState } from 'react'
import type { ShoppingListItem } from '@/types/food.types'
import type { CreateShoppingItemInput } from '@/lib/validations/food'

export function useShoppingList(initialItems: ShoppingListItem[]) {
  const [items, setItems] = useState<ShoppingListItem[]>(initialItems)

  const uncheckedItems = items.filter(i => !i.checked)
  const checkedItems = items.filter(i => i.checked)

  const itemsByCategory = uncheckedItems.reduce<Record<string, ShoppingListItem[]>>((acc, item) => {
    const cat = item.category ?? 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  async function addItem(input: CreateShoppingItemInput): Promise<boolean> {
    const res = await fetch('/api/food/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return false
    const { item } = await res.json() as { item: ShoppingListItem }
    setItems(prev => [...prev, item])
    return true
  }

  async function toggleChecked(id: string): Promise<boolean> {
    const item = items.find(i => i.id === id)
    if (!item) return false
    const res = await fetch(`/api/food/shopping-list/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: !item.checked }),
    })
    if (!res.ok) return false
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
    return true
  }

  async function deleteItem(id: string): Promise<boolean> {
    const res = await fetch(`/api/food/shopping-list/${id}`, { method: 'DELETE' })
    if (!res.ok) return false
    setItems(prev => prev.filter(i => i.id !== id))
    return true
  }

  async function clearChecked(): Promise<void> {
    const checked = items.filter(i => i.checked)
    await Promise.all(checked.map(i => deleteItem(i.id)))
  }

  return { items, uncheckedItems, checkedItems, itemsByCategory, addItem, toggleChecked, deleteItem, clearChecked }
}
