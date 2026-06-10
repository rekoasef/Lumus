'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Check, X, FileText, Loader2, ChevronDown, ChevronUp, ScanLine } from 'lucide-react'
import type { ShoppingListItem, ProductScanResult } from '@/types/food.types'
import type { CreateShoppingItemInput } from '@/lib/validations/food'
import { BarcodeScanner } from './barcode-scanner'

interface ParsedItem { name: string; quantity: string | null; category: string }

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
  const [showScanner, setShowScanner] = useState(false)

  // import mode
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parsedItems, setParsedItems] = useState<ParsedItem[] | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [selectedParsed, setSelectedParsed] = useState<Set<number>>(new Set())
  const [isConfirming, setIsConfirming] = useState(false)

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

  async function handleScanToList(product: ProductScanResult) {
    const name = [product.name, product.brand].filter(Boolean).join(' — ') || `Código ${product.code}`
    await onAdd({
      name,
      quantity: product.quantity ?? undefined,
      category: undefined,
    })
  }

  async function handleParse() {
    if (!importText.trim()) return
    setIsParsing(true)
    setImportError(null)
    setParsedItems(null)

    const res = await fetch('/api/food/shopping-list/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: importText }),
    })

    const data = await res.json()
    setIsParsing(false)

    if (!res.ok) {
      setImportError(data.error ?? 'Error al parsear la lista')
      return
    }

    const items: ParsedItem[] = data.items ?? []
    setParsedItems(items)
    setSelectedParsed(new Set(items.map((_: ParsedItem, i: number) => i)))
  }

  async function handleConfirmImport() {
    if (!parsedItems) return
    setIsConfirming(true)

    const toAdd = parsedItems.filter((_, i) => selectedParsed.has(i))
    for (const item of toAdd) {
      await onAdd({
        name: item.name,
        quantity: item.quantity ?? undefined,
        category: item.category,
      })
    }

    setIsConfirming(false)
    setShowImport(false)
    setImportText('')
    setParsedItems(null)
    setSelectedParsed(new Set())
  }

  function toggleParsedItem(i: number) {
    setSelectedParsed(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const totalItems = uncheckedItems.length + checkedItems.length
  const checkedCount = checkedItems.length

  return (
    <div className="space-y-4">
      {/* Stats header */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-secondary)]">{uncheckedItems.length}</span> pendientes
            {checkedCount > 0 && <span className="ml-2 text-[var(--text-muted)]/60">· {checkedCount} comprados</span>}
          </p>
          {checkedCount > 0 && (
            <button
              onClick={onClearChecked}
              className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 transition-colors"
            >
              <Trash2 size={11} />
              Limpiar comprados
            </button>
          )}
        </div>
      )}

      {/* Add item form */}
      <div
        className="lumus-glass rounded-xl p-4 space-y-2"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      >
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
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none"
        />

        {/* Extra actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2 text-xs text-[var(--text-muted)] transition-colors hover:border-[#f97316]/40 hover:text-[var(--text-secondary)]"
          >
            <ScanLine size={12} />
            Escanear código
          </button>
          <button
            onClick={() => { setShowImport(true); setParsedItems(null); setImportText(''); setImportError(null) }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2 text-xs text-[var(--text-muted)] transition-colors hover:border-[#f97316]/40 hover:text-[var(--text-secondary)]"
          >
            <FileText size={12} />
            Importar texto
          </button>
        </div>
      </div>

      {/* Items by category */}
      {uncheckedItems.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">La lista está vacía</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]/60">Agregá ítems arriba o importá una lista</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(itemsByCategory).map(([category, items]) => (
            <div
              key={category}
              className="lumus-glass rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {category}
                </p>
                <span className="text-[0.6rem] text-[var(--text-muted)]/60">{items.length}</span>
              </div>
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
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
          <button
            onClick={() => setShowChecked(s => !s)}
            className="flex w-full items-center justify-between py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <span>{showChecked ? 'Ocultar' : 'Ver'} comprados ({checkedItems.length})</span>
            {showChecked ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showChecked && (
            <div
              className="mt-2 lumus-glass rounded-xl overflow-hidden opacity-60"
              style={{ border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {checkedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: idx < checkedItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
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

      {/* Barcode scanner modal */}
      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner
            onAddToList={handleScanToList}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Importar lista</h3>
              <button onClick={() => setShowImport(false)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10">
                <X size={14} />
              </button>
            </div>

            {!parsedItems ? (
              <>
                <div>
                  <p className="mb-2 text-xs text-[var(--text-muted)]">Pegá tu lista en cualquier formato</p>
                  <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Ej: 2kg de tomates, 1 litro de leche, aceite de oliva, queso rallado..."
                    rows={6}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#f97316]/50 focus:outline-none"
                  />
                </div>

                {importError && (
                  <p className="text-xs text-red-400">{importError}</p>
                )}

                <button
                  onClick={handleParse}
                  disabled={!importText.trim() || isParsing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f97316] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#ea6c0c] disabled:opacity-40"
                >
                  {isParsing ? (
                    <><Loader2 size={14} className="animate-spin" /> Procesando...</>
                  ) : (
                    'Procesar con IA'
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--text-muted)]">
                      {parsedItems.length} items encontrados — seleccioná los que querés agregar
                    </p>
                    <button
                      onClick={() =>
                        setSelectedParsed(
                          selectedParsed.size === parsedItems.length
                            ? new Set()
                            : new Set(parsedItems.map((_, i) => i))
                        )
                      }
                      className="text-[0.7rem] text-[var(--accent-lumus)] hover:underline"
                    >
                      {selectedParsed.size === parsedItems.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/[0.04]">
                    {parsedItems.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => toggleParsedItem(i)}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03] ${
                          selectedParsed.has(i) ? 'opacity-100' : 'opacity-40'
                        }`}
                      >
                        <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all ${
                          selectedParsed.has(i) ? 'border-[#f97316] bg-[#f97316]' : 'border-white/20'
                        }`}>
                          {selectedParsed.has(i) && <Check size={9} className="text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                          <p className="text-[0.65rem] text-[var(--text-muted)]">
                            {[item.quantity, item.category].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setParsedItems(null); setImportError(null) }}
                    className="flex-1 rounded-xl border border-white/10 py-2 text-xs text-[var(--text-muted)] hover:bg-white/5"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={selectedParsed.size === 0 || isConfirming}
                    className="flex-1 rounded-xl bg-[#f97316] py-2 text-xs font-medium text-white transition-colors hover:bg-[#ea6c0c] disabled:opacity-40"
                  >
                    {isConfirming ? 'Agregando...' : `Agregar ${selectedParsed.size} items`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
