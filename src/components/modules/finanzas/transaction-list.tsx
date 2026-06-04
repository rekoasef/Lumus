'use client'

import { useState, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, ArrowLeft, CalendarDays } from 'lucide-react'
import type { Transaction, Wallet, FinanceCategory } from '@/types/finance.types'
import { TransactionItem } from './transaction-item'
import { TransactionForm } from './transaction-form'
import type { CreateTransactionInput, UpdateTransactionInput } from '@/lib/validations/finance'
import { CategoryIcon } from '@/lib/utils/category-icons'
import { confirm } from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'

// ——— tipos ———

type ViewType = 'gastos' | 'ingresos'
type FilterMode = 'dia' | 'semana' | 'mes' | 'año' | 'periodo'

interface CategoryGroup {
  key: string
  categoryId: string | null
  category: Pick<FinanceCategory, 'id' | 'name' | 'color' | 'icon'> | null
  total: number
  count: number
  transactions: Transaction[]
}

// ——— helpers SVG donut ———

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, outerR: number, innerR: number, start: number, end: number): string {
  const sweep = Math.min(end - start, 359.99)
  const endAngle = start + sweep
  const so = polarToCartesian(cx, cy, outerR, start)
  const eo = polarToCartesian(cx, cy, outerR, endAngle)
  const ei = polarToCartesian(cx, cy, innerR, endAngle)
  const si = polarToCartesian(cx, cy, innerR, start)
  const large = sweep > 180 ? 1 : 0
  return [
    `M ${so.x.toFixed(2)} ${so.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${eo.x.toFixed(2)} ${eo.y.toFixed(2)}`,
    `L ${ei.x.toFixed(2)} ${ei.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${si.x.toFixed(2)} ${si.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

// ——— helpers de fechas ———

function toLocalStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return toLocalStr(new Date())
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return toLocalStr(d)
}

function getDiaLabel(dateStr: string): string {
  const today = todayStr()
  if (dateStr === today) return 'Hoy'
  if (dateStr === addDays(today, -1)) return 'Ayer'
  if (dateStr === addDays(today, 1)) return 'Mañana'
  const d = new Date(dateStr + 'T12:00:00')
  const raw = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function getSemanaDates(offset: number): { from: string; to: string; label: string } {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - diff + offset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const from = toLocalStr(monday)
  const to = toLocalStr(sunday)
  let label: string
  if (offset === 0) label = 'Esta semana'
  else if (offset === -1) label = 'Semana pasada'
  else {
    const mo = monday.toLocaleString('es-AR', { month: 'short' })
    const so2 = sunday.toLocaleString('es-AR', { month: 'short', year: 'numeric' })
    label = `${monday.getDate()} ${mo} – ${sunday.getDate()} ${so2}`
  }
  return { from, to, label }
}

function getMesDates(offset: number): { from: string; to: string; label: string } {
  const d = new Date()
  const target = new Date(d.getFullYear(), d.getMonth() + offset, 1)
  const from = toLocalStr(target)
  const to = toLocalStr(new Date(target.getFullYear(), target.getMonth() + 1, 0))
  const raw = target.toLocaleString('es-AR', { month: 'long', year: 'numeric' })
  return { from, to, label: raw.charAt(0).toUpperCase() + raw.slice(1) }
}

function getAñoDates(offset: number): { from: string; to: string; label: string } {
  const year = new Date().getFullYear() + offset
  return { from: `${year}-01-01`, to: `${year}-12-31`, label: String(year) }
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${m % 1 === 0 ? m : m.toFixed(1).replace('.', ',')} M$`
  }
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString('es-AR')} K$`
  return `$${n}`
}

// ——— props ———

interface TransactionListProps {
  transactions: Transaction[]
  loading: boolean
  wallets: Wallet[]
  categories: FinanceCategory[]
  onCreate: (data: CreateTransactionInput) => Promise<Transaction | null>
  onUpdate: (id: string, data: UpdateTransactionInput) => Promise<Transaction | null>
  onDelete: (id: string) => Promise<boolean>
}

const FILTER_TABS: { id: FilterMode; label: string }[] = [
  { id: 'dia',     label: 'Día' },
  { id: 'semana',  label: 'Semana' },
  { id: 'mes',     label: 'Mes' },
  { id: 'año',     label: 'Año' },
  { id: 'periodo', label: 'Período' },
]

// ——— componente ———

export function TransactionList({
  transactions,
  loading,
  wallets,
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: TransactionListProps) {
  const [viewType, setViewType]   = useState<ViewType>('gastos')
  const [filterMode, setFilterMode] = useState<FilterMode>('periodo')

  // Estado por modo de filtro
  const [diaDate, setDiaDate]   = useState<string>(todayStr())
  const [offset, setOffset]     = useState(0)   // semana / mes / año
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo]   = useState('')

  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Transaction | null>(null)

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

  // ——— rangos pre-calculados ———

  const semanaData = useMemo(() => getSemanaDates(offset), [offset])
  const mesData    = useMemo(() => getMesDates(offset), [offset])
  const añoData    = useMemo(() => getAñoDates(offset), [offset])

  // ——— filtrado por fecha ———

  const filteredByDate = useMemo(() => {
    if (filterMode === 'dia') {
      return transactions.filter(t => t.date === diaDate)
    }
    if (filterMode === 'semana') {
      return transactions.filter(t => t.date >= semanaData.from && t.date <= semanaData.to)
    }
    if (filterMode === 'mes') {
      return transactions.filter(t => t.date >= mesData.from && t.date <= mesData.to)
    }
    if (filterMode === 'año') {
      return transactions.filter(t => t.date >= añoData.from && t.date <= añoData.to)
    }
    // periodo
    if (rangeFrom && rangeTo) return transactions.filter(t => t.date >= rangeFrom && t.date <= rangeTo)
    if (rangeFrom)            return transactions.filter(t => t.date >= rangeFrom)
    if (rangeTo)              return transactions.filter(t => t.date <= rangeTo)
    return transactions
  }, [transactions, filterMode, diaDate, semanaData, mesData, añoData, rangeFrom, rangeTo])

  // ——— totales ———

  const totalGastos   = useMemo(() => filteredByDate.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0), [filteredByDate])
  const totalIngresos = useMemo(() => filteredByDate.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0), [filteredByDate])
  const currentTotal  = viewType === 'gastos' ? totalGastos : totalIngresos

  // ——— grupos de categoría ———

  const categoryGroups = useMemo((): CategoryGroup[] => {
    const relevant = filteredByDate.filter(t =>
      viewType === 'gastos' ? t.type === 'gasto' : t.type === 'ingreso',
    )
    const map = new Map<string, CategoryGroup>()
    for (const t of relevant) {
      const key = t.category_id ?? '__none__'
      const g = map.get(key)
      if (!g) {
        map.set(key, { key, categoryId: t.category_id, category: t.category ?? null, total: t.amount, count: 1, transactions: [t] })
      } else {
        g.total += t.amount
        g.count++
        g.transactions.push(t)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filteredByDate, viewType])

  const selectedGroup = selectedCategoryKey
    ? (categoryGroups.find(g => g.key === selectedCategoryKey) ?? null)
    : null

  // ——— segmentos del donut ———

  const chartSegments = useMemo(() => {
    if (currentTotal === 0) return []
    const cx = 100, cy = 100, outerR = 82, innerR = 54, gap = 1.5
    let angle = 0
    return categoryGroups
      .filter(g => g.total > 0)
      .map(g => {
        const sweep = (g.total / currentTotal) * 360
        if (sweep < 2) return null
        const start = angle + gap / 2
        const end   = angle + sweep - gap / 2
        angle += sweep
        return { key: g.key, d: arcPath(cx, cy, outerR, innerR, start, end), color: g.category?.color ?? '#475569' }
      })
      .filter(Boolean)
  }, [categoryGroups, currentTotal])

  // ——— handlers ———

  function handleFilterMode(mode: FilterMode) {
    setFilterMode(mode)
    setOffset(0)
    if (mode === 'dia') setDiaDate(todayStr())
    setSelectedCategoryKey(null)
  }

  function navigateDia(delta: number) {
    setDiaDate(d => addDays(d, delta))
    setSelectedCategoryKey(null)
  }

  function navigateOffset(delta: number) {
    setOffset(o => o + delta)
    setSelectedCategoryKey(null)
  }

  function getDefaultDate(): string {
    if (filterMode === 'dia') return diaDate
    if (filterMode === 'semana') {
      const today = todayStr()
      return today >= semanaData.from && today <= semanaData.to ? today : semanaData.from
    }
    if (filterMode === 'mes') {
      const today = todayStr()
      return today >= mesData.from && today <= mesData.to ? today : mesData.from
    }
    return todayStr()
  }

  async function handleSave(data: CreateTransactionInput) {
    if (editing) {
      await onUpdate(editing.id, data as UpdateTransactionInput)
      toast.success('Movimiento actualizado')
    } else {
      await onCreate(data)
      toast.success('Movimiento registrado')
    }
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ description: '¿Eliminar este movimiento?' })
    if (!ok) return
    await onDelete(id)
    toast.success('Movimiento eliminado')
  }

  function handleEdit(t: Transaction) {
    setEditing(t)
    setShowForm(true)
  }

  const subNavLabel =
    filterMode === 'semana' ? semanaData.label :
    filterMode === 'mes'    ? mesData.label :
    filterMode === 'año'    ? añoData.label : ''

  const isPeriodoAll = filterMode === 'periodo' && !rangeFrom && !rangeTo

  // ——— render ———

  return (
    <div>

      {/* ——— Tabs de filtro ——— */}
      <div className="flex items-center justify-between border-b border-white/[0.06] gap-2">
        <div className="flex overflow-x-auto scrollbar-hide min-w-0">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleFilterMode(tab.id)}
              className={`relative flex-shrink-0 px-3 pb-3 pt-1.5 text-xs font-medium transition-colors ${
                filterMode === tab.id
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
              {filterMode === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--accent-lumus)]" />
              )}
            </button>
          ))}
        </div>

        {/* Botón Nuevo — visible en desktop, en mobile es FAB flotante */}
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          disabled={loading || wallets.length === 0}
          className="mb-1 hidden items-center gap-1.5 rounded-xl bg-[var(--accent-lumus)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 sm:flex"
        >
          <Plus size={13} />
          Nuevo
        </button>
      </div>

      {/* ——— Sub-nav por modo ——— */}
      <div className="border-b border-white/[0.06] px-1 py-2.5 mb-4">

        {/* Día: ← Hoy → + ícono calendario */}
        {filterMode === 'dia' && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateDia(-1)}
              className="rounded-lg border border-white/10 p-1.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="flex items-center gap-2">
              <span className="lumus-heading text-sm font-semibold capitalize text-[var(--text-primary)]">
                {getDiaLabel(diaDate)}
              </span>
              {/* El label envuelve el input invisible para abrir el picker nativo */}
              <label className="relative cursor-pointer text-[var(--text-muted)] hover:text-[var(--accent-lumus)] transition-colors" title="Elegir fecha">
                <CalendarDays size={14} />
                <input
                  type="date"
                  value={diaDate}
                  onChange={e => {
                    if (e.target.value) {
                      setDiaDate(e.target.value)
                      setSelectedCategoryKey(null)
                    }
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [color-scheme:dark]"
                />
              </label>
            </div>

            <button
              onClick={() => navigateDia(1)}
              className="rounded-lg border border-white/10 p-1.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Semana / Mes / Año: ← label → */}
        {(filterMode === 'semana' || filterMode === 'mes' || filterMode === 'año') && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateOffset(-1)}
              className="rounded-lg border border-white/10 p-1.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="lumus-heading text-sm font-semibold capitalize text-[var(--text-primary)]">
              {subNavLabel}
            </span>
            <button
              onClick={() => navigateOffset(1)}
              className="rounded-lg border border-white/10 p-1.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Período: Todos | Desde — Hasta */}
        {filterMode === 'periodo' && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              onClick={() => { setRangeFrom(''); setRangeTo(''); setSelectedCategoryKey(null) }}
              className={`self-start rounded-lg px-2.5 py-1 text-xs font-medium transition-colors sm:shrink-0 ${
                isPeriodoAll
                  ? 'text-[var(--accent-lumus)] underline underline-offset-2'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Todos
            </button>

            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col min-w-0">
                <label className="lumus-label mb-1 block text-[0.55rem] text-[var(--text-muted)]">DESDE</label>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={e => { setRangeFrom(e.target.value); setSelectedCategoryKey(null) }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none [color-scheme:dark] sm:py-1.5 sm:text-xs"
                />
              </div>
              <span className="mb-2 text-sm text-[var(--text-muted)]">–</span>
              <div className="flex flex-1 flex-col min-w-0">
                <label className="lumus-label mb-1 block text-[0.55rem] text-[var(--text-muted)]">HASTA</label>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={e => { setRangeTo(e.target.value); setSelectedCategoryKey(null) }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none [color-scheme:dark] sm:py-1.5 sm:text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ——— Drill-down de categoría ——— */}
      {selectedGroup ? (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => setSelectedCategoryKey(null)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)]"
            >
              <ArrowLeft size={13} />
              Volver
            </button>
            <div className="flex items-center gap-2">
              {selectedGroup.category?.icon && (
                <CategoryIcon
                  icon={selectedGroup.category.icon}
                  size={14}
                  style={{ color: selectedGroup.category.color ?? '#64748b' }}
                />
              )}
              <h3 className="lumus-heading text-sm font-semibold text-[var(--text-primary)]">
                {selectedGroup.category?.name ?? 'Sin categoría'}
              </h3>
              <span className="text-xs text-[var(--text-muted)]">
                · {selectedGroup.count} {selectedGroup.count === 1 ? 'movimiento' : 'movimientos'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {selectedGroup.transactions
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(t => (
                <TransactionItem key={t.id} transaction={t} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <span className="text-xs text-[var(--text-muted)]">Total {viewType}</span>
            <span
              className="lumus-heading font-bold"
              style={{ color: viewType === 'gastos' ? 'var(--danger)' : 'var(--success)' }}
            >
              {viewType === 'gastos' ? '−' : '+'}{fmt(selectedGroup.total)}
            </span>
          </div>
        </div>

      ) : (
        <>
          {/* Skeleton */}
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.025]" />
              ))}
            </div>
          )}

          {!loading && wallets.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">Primero creá una billetera para registrar movimientos.</p>
            </div>
          )}

          {!loading && wallets.length > 0 && (
            <>
              {/* ——— Toggle GASTOS | INGRESOS ——— */}
              <div className="mb-5 flex gap-8 border-b border-white/[0.06]">
                <button
                  onClick={() => setViewType('gastos')}
                  className={`relative pb-3 text-sm font-bold tracking-widest transition-colors ${
                    viewType === 'gastos'
                      ? 'text-[var(--danger)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  GASTOS
                  {viewType === 'gastos' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[var(--danger)]" />
                  )}
                </button>
                <button
                  onClick={() => setViewType('ingresos')}
                  className={`relative pb-3 text-sm font-bold tracking-widest transition-colors ${
                    viewType === 'ingresos'
                      ? 'text-[var(--success)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  INGRESOS
                  {viewType === 'ingresos' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[var(--success)]" />
                  )}
                </button>
              </div>

              {/* ——— Donut chart ——— */}
              <div className="mb-6 flex justify-center">
                <div className="w-full max-w-[200px]">
                  <svg viewBox="0 0 200 200" className="w-full">
                    {chartSegments.length > 0 ? (
                      <>
                        {chartSegments.map(seg => seg && <path key={seg.key} d={seg.d} fill={seg.color} />)}
                        <circle
                          cx="100" cy="100" r="54"
                          fill="none"
                          stroke="rgba(255,255,255,0.07)"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                      </>
                    ) : (
                      <circle
                        cx="100" cy="100" r="82"
                        fill="rgba(255,255,255,0.03)"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                      />
                    )}
                    <circle cx="100" cy="100" r="52" fill="#111118" />
                    <text x="100" y="95" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8.5" letterSpacing="1.5" fontFamily="inherit">
                      {viewType === 'gastos' ? 'GASTOS' : 'INGRESOS'}
                    </text>
                    <text x="100" y="114" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" fontFamily="inherit">
                      {fmtShort(currentTotal)}
                    </text>
                  </svg>
                </div>
              </div>

              {/* ——— Lista de categorías ——— */}
              {categoryGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 py-8 text-center">
                  <p className="text-sm text-[var(--text-muted)]">Sin {viewType} en este período.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categoryGroups.map(group => {
                    const color = group.category?.color ?? '#475569'
                    const pct = currentTotal > 0 ? Math.round((group.total / currentTotal) * 100) : 0
                    return (
                      <button
                        key={group.key}
                        onClick={() => setSelectedCategoryKey(group.key)}
                        className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.05]"
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: color }}
                        >
                          {group.category?.icon ? (
                            <CategoryIcon icon={group.category.icon} size={18} style={{ color: 'white' }} />
                          ) : (
                            <span className="text-sm font-bold text-white">
                              {group.category?.name?.[0]?.toUpperCase() ?? '?'}
                            </span>
                          )}
                        </div>

                        <span className="flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
                          {group.category?.name ?? 'Sin categoría'}
                        </span>

                        <span className="lumus-label w-10 text-right text-xs text-[var(--text-muted)]">
                          {pct} %
                        </span>

                        <span
                          className="lumus-heading w-28 text-right text-sm font-semibold"
                          style={{ color: viewType === 'gastos' ? 'var(--danger)' : 'var(--success)' }}
                        >
                          {fmt(group.total)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* FAB flotante — solo mobile */}
      <button
        onClick={() => { setEditing(null); setShowForm(true) }}
        disabled={loading || wallets.length === 0}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-lumus)] text-white shadow-lg shadow-[var(--accent-lumus)]/30 active:scale-95 transition-transform disabled:opacity-50 sm:hidden"
        aria-label="Nuevo movimiento"
      >
        <Plus size={22} />
      </button>

      {/* Formulario */}
      {showForm && (
        <TransactionForm
          wallets={wallets}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          initial={editing ?? undefined}
          defaultDate={editing ? undefined : getDefaultDate()}
        />
      )}
    </div>
  )
}
