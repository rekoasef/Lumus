'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Merge } from 'lucide-react'
import type { FinanceCategory, CategoryType } from '@/types/finance.types'
import { CategoryForm } from './category-form'
import { MergeCategoryDialog } from './merge-category-dialog'
import { useFinanceCategories } from '@/hooks/use-finance-categories'
import type { CreateCategoryInput } from '@/lib/validations/finance'
import { CategoryIcon } from '@/lib/utils/category-icons'
import { confirm } from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'

interface CategoryListProps {
  initialCategories: FinanceCategory[]
}

export function CategoryList({ initialCategories }: CategoryListProps) {
  const { categories, byType, loading, createCategory, updateCategory, deleteCategory, mergeCategory } =
    useFinanceCategories(initialCategories)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<FinanceCategory | null>(null)
  const [activeTab, setActiveTab] = useState<CategoryType>('gasto')
  const [merging, setMerging] = useState<FinanceCategory | null>(null)
  const [mergeLoading, setMergeLoading] = useState(false)

  async function handleSave(data: CreateCategoryInput) {
    try {
      if (editing) {
        await updateCategory(editing.id, data)
        toast.success('Categoría actualizada')
      } else {
        await createCategory(data)
        toast.success('Categoría creada')
      }
    } catch (e) {
      // El formulario queda abierto con lo cargado, para corregir y reintentar.
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar la categoría')
      return
    }
    setShowForm(false)
    setEditing(null)
  }

  function handleEdit(cat: FinanceCategory) {
    setEditing(cat)
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ description: '¿Eliminar esta categoría?' })
    if (!ok) return
    try {
      await deleteCategory(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar la categoría')
      return
    }
    toast.success('Categoría eliminada')
  }

  async function handleMerge(targetId: string) {
    if (!merging) return
    setMergeLoading(true)
    const target = categories.find(c => c.id === targetId)

    let result
    try {
      result = await mergeCategory(merging.id, targetId)
    } catch (e) {
      // El motivo del servidor y no "no se pudo": la función SQL rechaza mezclar
      // un gasto con un ingreso, y eso hay que poder leerlo.
      toast.error(e instanceof Error ? e.message : 'No se pudo unificar')
      return
    } finally {
      setMergeLoading(false)
    }

    const moved = result.transactions_visible + result.recurring + result.budgets_moved + result.budgets_merged
    toast.success(
      moved === 0
        ? `"${merging.name}" se unificó con "${target?.name}"`
        : `Se movieron ${moved} registros a "${target?.name}"`
    )
    setMerging(null)
  }

  const visibleCategories = byType(activeTab)
  // Solo del mismo tipo: la función SQL rechaza mezclar gastos con ingresos.
  const mergeCandidates = merging
    ? categories.filter(c => c.type === merging.type && c.id !== merging.id)
    : []

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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {visibleCategories.map(cat => (
          <div
            key={cat.id}
            className="group flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] py-1.5 pr-1.5 pl-3 can-hover:py-2.5 can-hover:pr-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${cat.color}22` }}
              >
                {cat.icon ? (
                  <CategoryIcon icon={cat.icon} size={14} style={{ color: cat.color }} />
                ) : (
                  <span className="text-[0.65rem] font-bold" style={{ color: cat.color }}>
                    {cat.name[0].toUpperCase()}
                  </span>
                )}
              </div>
              <span className="truncate text-sm text-[var(--text-secondary)]">{cat.name}</span>
            </div>
            <div className="flex shrink-0 gap-1 transition-opacity can-hover:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                onClick={() => setMerging(cat)}
                className="flex size-10 items-center justify-center rounded-lg text-[var(--text-muted)] can-hover:size-6 can-hover:rounded hover:text-[var(--accent-lumus)]"
                aria-label="Unificar"
                title="Unificar con otra categoría"
              >
                <Merge size={15} />
              </button>
              {!cat.is_default && (
                <>
                <button
                  onClick={() => handleEdit(cat)}
                  className="flex size-10 items-center justify-center rounded-lg text-[var(--text-muted)] can-hover:size-6 can-hover:rounded hover:text-[var(--text-primary)]"
                  aria-label="Editar"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  disabled={loading}
                  className="flex size-10 items-center justify-center rounded-lg text-[var(--text-muted)] can-hover:size-6 can-hover:rounded hover:text-[var(--danger)]"
                  aria-label="Eliminar"
                >
                  <Trash2 size={15} />
                </button>
                </>
              )}
            </div>
          </div>
        ))}

        {visibleCategories.length === 0 && (
          <p className="col-span-full py-4 text-center text-sm text-[var(--text-muted)]">
            No hay categorías de {activeTab === 'gasto' ? 'gastos' : 'ingresos'} todavía.
          </p>
        )}
      </div>

      <AnimatePresence>
        {merging && (
          <MergeCategoryDialog
            source={merging}
            candidates={mergeCandidates}
            merging={mergeLoading}
            onMerge={handleMerge}
            onClose={() => setMerging(null)}
          />
        )}
      </AnimatePresence>

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
