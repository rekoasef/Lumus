'use client'

import { useState } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import type { ShoppingListItem } from '@/types/food.types'
import type { CreateShoppingItemInput } from '@/lib/validations/food'

interface ShoppingListProps {
  uncheckedItems: ShoppingListItem[]
  checkedItems: ShoppingListItem[]
  itemsByCategory: Record<string, ShoppingListItem[]>
  onAdd: (input: CreateShoppingItemInput) => Promise<boolean>
  onToggle: (id: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onClearChecked: () => Promise<void>
}

export function ShoppingListComponent({
  uncheckedItems,
  checkedItems,
  itemsByCategory,
  onAdd,
  onToggle,
  onDelete,
  onClearChecked,
}: ShoppingListProps) {
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showChecked, setShowChecked] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) return
    setIsAdding(true)
    await onAdd({
      name: newName.trim(),
      quantity: newQty.trim() || undefined,
      category: newCategory.trim() || undefined,
    })
    setNewName('')
    setNewQty('')
    setNewCategory('')
    setIsAdding(false)
  }

  return (
    <div className="space-y-4">
      {/* Add item form */}
      <div
        className="lumus-glass rounded-xl p-4"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="mb-3 text-xs text-[var(--text-muted)]">Agregar ítem</p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="¿Qué necesitás?"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
          />
          <input
            value={newQty}
            onChange={e => setNewQty(e.target.value)}
            placeholder="Cant."
            className="w-20 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || isAdding}
            className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl bg-[#f97316] text-white transition-colors hover:bg-[#ea6c0c] disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>
        <input
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
          placeholder="Categoría (ej: Frutas, Lácteos...)"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
        />
      </div>

      {/* Items by category */}
      {uncheckedItems.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">La lista está vacía</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]/60">Agregá ítems arriba</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(itemsByCategory).map(([category, items]) => (
            <div
              key={category}
              className="lumus-glass rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {category}
                </p>
              </div>
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <button
                    onClick={() => onToggle(item.id)}
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
                      item.checked
                        ? 'border-[#f97316] bg-[#f97316]'
                        : 'border-white/20 hover:border-[#f97316]/50'
                    }`}
                  >
                    {item.checked && <Check size={11} className="text-white" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm ${item.checked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>
                      {item.name}
                    </span>
                    {item.quantity && (
                      <span className="ml-2 text-xs text-[var(--text-muted)]">{item.quantity}</span>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Checked items */}
      {checkedItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowChecked(s => !s)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              {showChecked ? 'Ocultar' : 'Ver'} tachados ({checkedItems.length})
            </button>
            <button
              onClick={onClearChecked}
              className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400"
            >
              <Trash2 size={11} />
              Limpiar tachados
            </button>
          </div>

          {showChecked && (
            <div
              className="lumus-glass rounded-xl overflow-hidden opacity-60"
              style={{ border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {checkedItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <button
                    onClick={() => onToggle(item.id)}
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[#f97316] bg-[#f97316] transition-all"
                  >
                    <Check size={11} className="text-white" />
                  </button>
                  <span className="flex-1 text-sm line-through text-[var(--text-muted)]">{item.name}</span>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
