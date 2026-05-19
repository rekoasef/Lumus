'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { FinanceCategory, CategoryType } from '@/types/finance.types'
import { CategoryForm } from './category-form'
import { useFinanceCategories } from '@/hooks/use-finance-categories'
import type { CreateCategoryInput } from '@/lib/validations/finance'

interface CategoryListProps {
  initialCategories: FinanceCategory[]
}

export function CategoryList({ initialCategories }: CategoryListProps) {
  const { categories, byType, loading, createCategory, updateCategory, deleteCategory } =
    useFinanceCategories(initialCategories)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<FinanceCategory | null>(null)
  const [activeTab, setActiveTab] = useState<CategoryType>('gasto')

  async function handleSave(data: CreateCategoryInput) {
    if (editing) {
      await updateCategory(editing.id, data)
    } else {
      await createCategory(data)
    }
    setShowForm(false)
    setEditing(null)
  }

  function handleEdit(cat: FinanceCategory) {
    setEditing(cat)
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta categoría?')) return
    await deleteCategory(id)
  }

  const visibleCategories = byType(activeTab)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex rounded-lg border border-white/10 p-0.5">
          {(['gasto', 'ingreso'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                activeTab === t
                  ? 'bg-white/10 text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t === 'gasto' ? 'Gastos' : 'Ingresos'}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] px-3 py-1.5 text-xs font-medium text-[var(--accent-lumus)] hover:bg-[var(--accent-lumus)]/20"
        >
          <Plus size={13} />
          Nueva
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibleCategories.map(cat => (
          <div
            key={cat.id}
            className="group flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="truncate text-sm text-[var(--text-secondary)]">{cat.name}</span>
            </div>
            {!cat.is_default && (
              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => handleEdit(cat)}
                  className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  aria-label="Editar"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  disabled={loading}
                  className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                  aria-label="Eliminar"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}

        {visibleCategories.length === 0 && (
          <p className="col-span-full py-4 text-center text-sm text-[var(--text-muted)]">
            No hay categorías de {activeTab === 'gasto' ? 'gastos' : 'ingresos'} todavía.
          </p>
        )}
      </div>

      {showForm && (
        <CategoryForm
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          initial={editing ?? undefined}
          defaultType={activeTab}
        />
      )}
    </div>
  )
}
