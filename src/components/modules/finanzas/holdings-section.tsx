'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { useHoldings } from '@/hooks/use-holdings'
import { HoldingForm } from './holding-form'
import { confirm } from '@/components/shared/confirm-dialog'
import { formatCurrency } from '@/lib/utils/format-currency'
import {
  portfolioTotals,
  resolvePriceUsd,
  valuateHolding,
  type Holding,
  type HoldingValuation,
} from '@/lib/finance/holdings'
import type { DailyRate } from '@/lib/finance/purchasing-power'
import type { CreateHoldingInput } from '@/lib/validations/finance'

const LABELS = {
  title: 'Inversiones',
  subtitle: 'Lo que tenés invertido, valuado al precio de hoy.',
  add: 'Agregar',
  empty: 'Todavía no cargaste ninguna inversión.',
  emptyHint: 'Cripto, acciones o un plazo fijo: lo que sumás acá entra en tu patrimonio.',
  total: 'Valor total',
  performance: 'Rendimiento',
  noReturn: 'Sin costo comparable',
  unpriced: (n: number) => `${n} sin precio — no suman al total`,
  delete: 'Eliminar',
  edit: 'Editar',
  confirmDelete: (name: string) => `¿Eliminar ${name}? Esto no borra ningún movimiento.`,
  noPrice: 'Sin precio',
} as const

interface HoldingsSectionProps {
  initialHoldings: Holding[]
  /** Precios en USD por `price_source`, resueltos en el server. */
  prices: Record<string, number>
  arsPerUsd: number
  rateHistory: DailyRate[]
}

function usd(value: number): string {
  return `US$ ${value.toLocaleString('es-AR', { maximumFractionDigits: value < 100 ? 2 : 0 })}`
}

export function HoldingsSection({ initialHoldings, prices, arsPerUsd, rateHistory }: HoldingsSectionProps) {
  const router = useRouter()
  const { holdings, saving, error, create, update, remove } = useHoldings(initialHoldings)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Holding | null>(null)

  const priceMap = useMemo(() => new Map(Object.entries(prices)), [prices])

  const rows = useMemo(() => holdings.map(holding => {
    const price = resolvePriceUsd(holding, priceMap)
    const valuation: HoldingValuation | null = price === null
      ? null
      : valuateHolding(holding, price, arsPerUsd, rateHistory)
    return { holding, valuation }
  }), [holdings, priceMap, arsPerUsd, rateHistory])

  const totals = useMemo(() => portfolioTotals(rows.map(r => r.valuation)), [rows])

  async function handleSave(input: CreateHoldingInput) {
    const saved = editing ? await update(editing.id, input) : await create(input)
    if (!saved) return
    setShowForm(false)
    setEditing(null)
    // Refresca el patrimonio del dashboard y los precios del server.
    router.refresh()
  }

  async function handleDelete(holding: Holding) {
    if (!(await confirm({ description: LABELS.confirmDelete(holding.name) }))) return
    if (await remove(holding.id)) router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">{LABELS.title}</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{LABELS.subtitle}</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-lumus)] px-3.5 py-2 text-xs font-semibold text-white"
        >
          <Plus size={14} /> {LABELS.add}
        </button>
      </div>

      {holdings.length > 0 && (
        <div className="lumus-glass grid grid-cols-2 gap-4 rounded-2xl p-5">
          <div>
            <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{LABELS.total}</p>
            <p className="mt-2 text-2xl font-bold leading-tight text-[var(--text-primary)]">{usd(totals.valueUsd)}</p>
            <p className="mt-1 text-[0.68rem] text-[var(--text-muted)]">
              {formatCurrency(totals.valueArs, 'ARS', 'rounded')}
            </p>
          </div>
          <div>
            <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{LABELS.performance}</p>
            {totals.costUsd > 0 ? (
              <>
                <p
                  className="mt-2 text-2xl font-bold leading-tight"
                  style={{ color: totals.returnUsd >= 0 ? '#22c55e' : '#ef4444' }}
                >
                  {totals.returnUsd >= 0 ? '+' : ''}{totals.returnPercent.toFixed(1)}%
                </p>
                <p className="mt-1 text-[0.68rem] text-[var(--text-muted)]">
                  {totals.returnUsd >= 0 ? '+' : '−'}{usd(Math.abs(totals.returnUsd))} sobre lo que pagaste
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{LABELS.noReturn}</p>
            )}
          </div>

          {totals.unpriced > 0 && (
            <p className="col-span-2 flex items-center gap-1.5 text-[0.68rem] text-[var(--warning)]">
              <AlertTriangle size={12} /> {LABELS.unpriced(totals.unpriced)}
            </p>
          )}
        </div>
      )}

      {holdings.length === 0 ? (
        <div className="lumus-glass rounded-2xl px-5 py-10 text-center">
          <p className="text-sm text-[var(--text-secondary)]">{LABELS.empty}</p>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">{LABELS.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ holding, valuation }) => (
            <div key={holding.id} className="lumus-glass group rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{holding.name}</p>
                  <p className="mt-0.5 text-[0.68rem] text-[var(--text-muted)]">
                    {holding.quantity.toLocaleString('es-AR', { maximumFractionDigits: 8 })}
                    {valuation ? ` · ${usd(valuation.priceUsd)} c/u` : ` · ${LABELS.noPrice}`}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => { setEditing(holding); setShowForm(true) }}
                    aria-label={LABELS.edit}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(holding)}
                    aria-label={LABELS.delete}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {valuation && (
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold leading-tight text-[var(--text-primary)]">{usd(valuation.valueUsd)}</p>
                    <p className="text-[0.68rem] text-[var(--text-muted)]">
                      {formatCurrency(valuation.valueArs, 'ARS', 'rounded')}
                    </p>
                  </div>

                  {valuation.hasReturn && (
                    <p
                      className="flex items-center gap-1 text-xs font-semibold"
                      style={{ color: valuation.returnUsd >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {valuation.returnUsd >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {valuation.returnUsd >= 0 ? '+' : ''}{valuation.returnPercent.toFixed(1)}%
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      {showForm && (
        <HoldingForm
          initial={editing ?? undefined}
          saving={saving}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
