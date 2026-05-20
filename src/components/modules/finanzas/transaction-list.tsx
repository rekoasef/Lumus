'use client'

import { useState, useCallback, useMemo } from 'react'
import { Plus, X, ChevronRight, ArrowLeft, CalendarDays, ChevronLeft } from 'lucide-react'
import type { Transaction, Wallet, FinanceCategory } from '@/types/finance.types'
import { TransactionItem } from './transaction-item'
import { TransactionForm } from './transaction-form'
import type { CreateTransactionInput, UpdateTransactionInput } from '@/lib/validations/finance'
import { CategoryIcon } from '@/lib/utils/category-icons'

// ——— tipos ———

type QuickFilter = 'hoy' | 'semana' | 'mes' | 'año'
type PeriodMode = 'mes' | 'semana' | 'año'

type CategoryGroup = {
  categoryId: string | null
  category: Pick<FinanceCategory, 'id' | 'name' | 'color' | 'icon'> | null
  totalGasto: number
  totalIngreso: number
  count: number
  transactions: Transaction[]
}

// ——— helpers ———

function getQuickFilterDates(qf: QuickFilter): { date_from: string; date_to: string } {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  if (qf === 'hoy') return { date_from: todayStr, date_to: todayStr }

  if (qf === 'semana') {
    const day = today.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - diff)
    return { date_from: monday.toISOString().slice(0, 10), date_to: todayStr }
  }

  if (qf === 'mes') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    return { date_from: first.toISOString().slice(0, 10), date_to: todayStr }
  }

  // año
  const first = new Date(today.getFullYear(), 0, 1)
  return { date_from: first.toISOString().slice(0, 10), date_to: todayStr }
}

function getPeriodDates(mode: PeriodMode, offset: number): { date_from: string; date_to: string; label: string } {
  if (mode === 'mes') {
    const d = new Date()
    const target = new Date(d.getFullYear(), d.getMonth() + offset, 1)
    const start = target.toISOString().slice(0, 10)
    const end = new Date(target.getFullYear(), target.getMonth() + 1, 0).toISOString().slice(0, 10)
    const label = target.toLocaleString('es-AR', { month: 'long', year: 'numeric' })
    return { date_from: start, date_to: end, label }
  }
  if (mode === 'semana') {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - diff + offset * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const start = monday.toISOString().slice(0, 10)
    const end = sunday.toISOString().slice(0, 10)
    const label = `${monday.getDate()} ${monday.toLocaleString('es-AR', { month: 'short' })} – ${sunday.getDate()} ${sunday.toLocaleString('es-AR', { month: 'short', year: 'numeric' })}`
    return { date_from: start, date_to: end, label }
  }
  // año
  const year = new Date().getFullYear() + offset
  return { date_from: `${year}-01-01`, date_to: `${year}-12-31`, label: String(year) }
}

function groupByCategory(transactions: Transaction[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>()

  for (const t of transactions) {
    const key = t.category_id ?? '__sin_categoria__'
    if (!map.has(key)) {
      map.set(key, {
        categoryId: t.category_id,
        category: t.category ?? null,
        totalGasto: 0,
        totalIngreso: 0,
        count: 0,
        transactions: [],
      })
    }
    const g = map.get(key)!
    if (t.type === 'gasto') g.totalGasto += t.amount
    if (t.type === 'ingreso') g.totalIngreso += t.amount
    g.count++
    g.transactions.push(t)
  }

  return Array.from(map.values()).sort((a, b) => b.totalGasto - a.totalGasto)
}

// ——— props ———

interface TransactionListProps {
  transactions: Transaction[]
  monthGastos: number
  monthIngresos: number
  loading: boolean
  wallets: Wallet[]
  categories: FinanceCategory[]
  onCreate: (data: CreateTransactionInput) => Promise<Transaction | null>
  onUpdate: (id: string, data: UpdateTransactionInput) => Promise<Transaction | null>
  onDelete: (id: string) => Promise<boolean>
}

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'hoy',    label: 'Hoy' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes',    label: 'Mes' },
  { id: 'año',    label: 'Año' },
]

// ——— componente ———

export function TransactionList({
  transactions,
  monthGastos,
  monthIngresos,
  loading,
  wallets,
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: TransactionListProps) {
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null)
  const [yearTransactions, setYearTransactions] = useState<Transaction[]>([])
  const [yearLoading, setYearLoading] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup | null>(null)

  const [showDateFilter, setShowDateFilter] = useState(false)
  const [pickedDate, setPickedDate] = useState('')
  const [customTransactions, setCustomTransactions] = useState<Transaction[] | null>(null)
  const [customLoading, setCustomLoading] = useState(false)

  const [periodMode, setPeriodMode] = useState<PeriodMode | null>(null)
  const [periodOffset, setPeriodOffset] = useState(0)
  const [periodTransactions, setPeriodTransactions] = useState<Transaction[] | null>(null)
  const [periodLoading, setPeriodLoading] = useState(false)
  const [showPeriodPanel, setShowPeriodPanel] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

  // Filtrado local por quick filter (sin llamada API — usa las transactions del mes ya cargadas)
  const quickFiltered = useMemo(() => {
    if (!quickFilter || quickFilter === 'año') return transactions
    const { date_from, date_to } = getQuickFilterDates(quickFilter)
    return transactions.filter(t => t.date >= date_from && t.date <= date_to)
  }, [quickFilter, transactions])

  // ——— quick filter ———

  const applyQuickFilter = useCallback(async (qf: QuickFilter) => {
    setQuickFilter(qf)
    setSelectedGroup(null)
    setCustomTransactions(null)
    setPickedDate('')
    setPeriodMode(null)
    setPeriodOffset(0)
    setPeriodTransactions(null)
    setShowPeriodPanel(false)

    if (qf === 'año') {
      const { date_from, date_to } = getQuickFilterDates('año')
      setYearLoading(true)
      try {
        const res = await fetch(`/api/finance/transactions?date_from=${date_from}&date_to=${date_to}&limit=500`)
        if (res.ok) {
          const data = await res.json() as { transactions: Transaction[] }
          setYearTransactions(data.transactions)
        }
      } finally {
        setYearLoading(false)
      }
    }
  }, [])

  const clearQuickFilter = useCallback(() => {
    setQuickFilter(null)
    setSelectedGroup(null)
    setYearTransactions([])
    setCustomTransactions(null)
    setPeriodMode(null)
    setPeriodOffset(0)
    setPeriodTransactions(null)
    setShowPeriodPanel(false)
  }, [])

  // ——— date filter ———

  const applyDateFilter = useCallback(async (date: string) => {
    if (!date) return
    setSelectedGroup(null)
    setQuickFilter(null)
    setPeriodMode(null)
    setPeriodOffset(0)
    setPeriodTransactions(null)
    setShowPeriodPanel(false)
    setCustomLoading(true)
    try {
      const res = await fetch(`/api/finance/transactions?date_from=${date}&date_to=${date}&limit=500`)
      if (res.ok) {
        const data = await res.json() as { transactions: Transaction[] }
        setCustomTransactions(data.transactions)
      }
    } finally {
      setCustomLoading(false)
    }
  }, [])

  const clearDateFilter = useCallback(() => {
    setCustomTransactions(null)
    setPickedDate('')
    setShowDateFilter(false)
  }, [])

  const fetchPeriod = useCallback(async (mode: PeriodMode, offset: number) => {
    const { date_from, date_to } = getPeriodDates(mode, offset)
    setPeriodLoading(true)
    setSelectedGroup(null)
    try {
      const res = await fetch(`/api/finance/transactions?date_from=${date_from}&date_to=${date_to}&limit=500`)
      if (res.ok) {
        const data = await res.json() as { transactions: Transaction[] }
        setPeriodTransactions(data.transactions)
      }
    } finally {
      setPeriodLoading(false)
    }
  }, [])

  const openPeriodMode = useCallback((mode: PeriodMode) => {
    setPeriodMode(mode)
    setPeriodOffset(0)
    setQuickFilter(null)
    setCustomTransactions(null)
    setPickedDate('')
    setShowDateFilter(false)
    setSelectedGroup(null)
    fetchPeriod(mode, 0)
  }, [fetchPeriod])

  const navigatePeriod = useCallback((delta: number) => {
    if (!periodMode) return
    const newOffset = periodOffset + delta
    setPeriodOffset(newOffset)
    fetchPeriod(periodMode, newOffset)
  }, [periodMode, periodOffset, fetchPeriod])

  const clearPeriodMode = useCallback(() => {
    setPeriodMode(null)
    setPeriodOffset(0)
    setPeriodTransactions(null)
    setShowPeriodPanel(false)
  }, [])

  // ——— display ———

  const isCustomDateActive = customTransactions !== null
  const isPeriodActive = periodMode !== null
  const isFilterActive = quickFilter !== null || isCustomDateActive || isPeriodActive

  const displayTransactions = customTransactions ?? periodTransactions ?? (quickFilter === 'año' ? yearTransactions : quickFiltered)

  const periodGastos   = displayTransactions.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
  const periodIngresos = displayTransactions.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)

  const groups = groupByCategory(displayTransactions)

  const isLoading = loading || yearLoading || customLoading || periodLoading

  // ——— acciones ———

  async function handleSave(data: CreateTransactionInput) {
    if (editing) {
      await onUpdate(editing.id, data as UpdateTransactionInput)
    } else {
      await onCreate(data)
    }
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este movimiento?')) return
    await onDelete(id)
  }

  function handleEdit(t: Transaction) {
    setEditing(t)
    setShowForm(true)
  }

  // ——— render ———

  return (
    <div>
      {/* Chips de filtro rápido */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { clearQuickFilter(); clearDateFilter() }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              !isFilterActive && !showPeriodPanel
                ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                : 'border-white/10 text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)]'
            }`}
          >
            Todos
          </button>
          {QUICK_FILTERS.map(qf => (
            <button
              key={qf.id}
              onClick={() => {
                clearDateFilter()
                quickFilter === qf.id ? clearQuickFilter() : applyQuickFilter(qf.id)
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                quickFilter === qf.id
                  ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                  : 'border-white/10 text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)]'
              }`}
            >
              {qf.label}
            </button>
          ))}

          <button
            onClick={() => {
              clearQuickFilter()
              setShowDateFilter(d => !d)
              if (isCustomDateActive) clearDateFilter()
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              isCustomDateActive || showDateFilter
                ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                : 'border-white/10 text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)]'
            }`}
          >
            <CalendarDays size={12} />
            Fecha
          </button>

          <button
            onClick={() => {
              if (showPeriodPanel) {
                clearPeriodMode()
              } else {
                clearQuickFilter()
                clearDateFilter()
                setShowDateFilter(false)
                setShowPeriodPanel(true)
              }
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              showPeriodPanel || isPeriodActive
                ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                : 'border-white/10 text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)]'
            }`}
          >
            Período
          </button>
        </div>

        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          disabled={isLoading || wallets.length === 0}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          <Plus size={14} />
          Nuevo movimiento
        </button>
      </div>

      {/* Panel de fecha específica */}
      {showDateFilter && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex-1">
            <label className="lumus-label mb-1.5 block text-[0.6rem] text-[var(--text-muted)]">DÍA</label>
            <input
              type="date"
              value={pickedDate}
              onChange={e => {
                setPickedDate(e.target.value)
                applyDateFilter(e.target.value)
              }}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none [color-scheme:dark]"
            />
          </div>
          {isCustomDateActive && (
            <button
              onClick={clearDateFilter}
              className="mt-5 flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-white/5"
            >
              <X size={12} />
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Panel de período navegable */}
      {showPeriodPanel && (
        <div className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          {/* Tabs Mes / Semana / Año */}
          <div className="mb-4 flex gap-1.5">
            {(['mes', 'semana', 'año'] as PeriodMode[]).map(m => (
              <button
                key={m}
                onClick={() => openPeriodMode(m)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium capitalize transition-colors ${
                  periodMode === m
                    ? 'bg-[var(--accent-lumus)] text-white'
                    : 'border border-white/10 text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)]'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Navegación ← label → */}
          {periodMode ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigatePeriod(-1)}
                className="rounded-lg border border-white/10 p-1.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)]"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="lumus-heading text-sm font-semibold capitalize text-[var(--text-primary)]">
                {getPeriodDates(periodMode, periodOffset).label}
              </span>
              <button
                onClick={() => navigatePeriod(1)}
                className="rounded-lg border border-white/10 p-1.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--text-muted)]">Seleccioná un período para navegar</p>
          )}
        </div>
      )}

      {/* Resumen del período */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--success)]/20 bg-[var(--success-muted)] px-4 py-3">
          <p className="lumus-label text-[0.6rem] text-[var(--success)]">INGRESOS</p>
          <p className="lumus-heading mt-1 text-xl font-bold text-[var(--success)]">
            {fmt(isFilterActive ? periodIngresos : monthIngresos)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.08] px-4 py-3">
          <p className="lumus-label text-[0.6rem] text-[var(--danger)]">GASTOS</p>
          <p className="lumus-heading mt-1 text-xl font-bold text-[var(--danger)]">
            {fmt(isFilterActive ? periodGastos : monthGastos)}
          </p>
        </div>
      </div>

      {/* Estado vacío */}
      {wallets.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">Primero creá una billetera para registrar movimientos.</p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.025]" />
          ))}
        </div>
      )}

      {/* ——— VISTA AGRUPADA (con filtro activo) ——— */}
      {!isLoading && isFilterActive && !selectedGroup && (
        <div>
          {displayTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">Sin movimientos en este período.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group, i) => {
                const color   = group.category?.color ?? '#64748b'
                const net     = group.totalIngreso - group.totalGasto
                const isGasto = group.totalGasto > group.totalIngreso

                return (
                  <button
                    key={group.categoryId ?? i}
                    onClick={() => setSelectedGroup(group)}
                    className="flex w-full items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${color}22` }}
                    >
                      {group.category?.icon ? (
                        <CategoryIcon icon={group.category.icon} size={16} style={{ color }} />
                      ) : (
                        <span className="text-xs font-bold" style={{ color }}>
                          {group.category?.name?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {group.category?.name ?? 'Sin categoría'}
                      </p>
                      <p className="text-[0.65rem] text-[var(--text-muted)]">
                        {group.count} {group.count === 1 ? 'movimiento' : 'movimientos'}
                      </p>
                    </div>

                    <p
                      className="lumus-heading shrink-0 text-base font-bold"
                      style={{ color: isGasto ? 'var(--danger)' : 'var(--success)' }}
                    >
                      {isGasto ? '−' : '+'}{fmt(Math.abs(net))}
                    </p>

                    <ChevronRight size={14} className="shrink-0 text-[var(--text-muted)]" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ——— DETALLE DE CATEGORÍA ——— */}
      {!isLoading && isFilterActive && selectedGroup && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => setSelectedGroup(null)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)]"
            >
              <ArrowLeft size={13} />
              Volver
            </button>
            <div className="flex items-center gap-2">
              {selectedGroup.category?.icon && (
                <CategoryIcon
                  icon={selectedGroup.category.icon}
                  size={15}
                  style={{ color: selectedGroup.category?.color ?? '#64748b' }}
                />
              )}
              <h3 className="lumus-heading text-sm font-semibold text-[var(--text-primary)]">
                {selectedGroup.category?.name ?? 'Sin categoría'}
              </h3>
              <span className="text-xs text-[var(--text-muted)]">
                — {selectedGroup.count} {selectedGroup.count === 1 ? 'movimiento' : 'movimientos'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {selectedGroup.transactions
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(t => (
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <span className="text-xs text-[var(--text-muted)]">Total gastos</span>
            <span className="lumus-heading font-bold text-[var(--danger)]">
              −{fmt(selectedGroup.totalGasto)}
            </span>
          </div>
        </div>
      )}

      {/* ——— VISTA LISTA NORMAL (sin filtro activo) ——— */}
      {!isLoading && !isFilterActive && (
        <>
          {wallets.length > 0 && transactions.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">Todavía no hay movimientos.</p>
            </div>
          )}
          {transactions.length > 0 && (
            <div className="space-y-2">
              {transactions.map(t => (
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Formulario */}
      {showForm && (
        <TransactionForm
          wallets={wallets}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          initial={editing ?? undefined}
        />
      )}

      {/* Limpiar filtro */}
      {(quickFilter || isPeriodActive) && (
        <button
          onClick={clearQuickFilter}
          className="mt-4 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
        >
          <X size={12} /> Limpiar filtro
        </button>
      )}
    </div>
  )
}
