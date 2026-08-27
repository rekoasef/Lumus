import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import type { PurchasingPowerChange } from '@/lib/finance/purchasing-power'

const LABELS = {
  title: 'Tu plata en dólares',
  window: (days: number) => `Últimos ${days} días`,
  lost: 'Perdiste',
  gained: 'Ganaste',
  flat: 'Tu poder de compra quedó igual.',
  lostBody: 'Es lo que le costó a tus pesos quedarse quietos.',
  gainedBody: 'Tus pesos quietos valen más en dólares que hace un mes.',
  noData: 'Todavía no hay cotización suficiente para comparar.',
} as const

interface PurchasingPowerCardProps {
  /** Saldo en pesos que se está midiendo. */
  amountArs: number
  change: PurchasingPowerChange | null
  days: number
}

/**
 * El costo de tener la plata en pesos.
 *
 * Es la pantalla que ninguna app importada tiene, porque el problema no existe
 * donde las hacen: "ahorraste 200.000 pesos" no dice nada sin saber qué hizo el
 * dólar en esos treinta días.
 *
 * Muestra el número aunque sea a favor: si el mes fue bueno para el peso, se
 * dice. Una app que solo avisa las malas se vuelve ruido.
 */
export function PurchasingPowerCard({ amountArs, change, days }: PurchasingPowerCardProps) {
  if (!change || amountArs <= 0) {
    return (
      <div className="lumus-glass rounded-2xl p-5">
        <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{LABELS.title}</p>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{LABELS.noData}</p>
      </div>
    )
  }

  const flat = Math.abs(change.percent) < 0.5
  const color = flat ? 'var(--text-secondary)' : change.lost ? '#ef4444' : '#22c55e'
  const Icon = flat ? Minus : change.lost ? TrendingDown : TrendingUp

  return (
    <div className="lumus-glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon size={15} style={{ color }} />
          <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{LABELS.title}</p>
        </div>
        <p className="text-[0.62rem] text-[var(--text-muted)]">{LABELS.window(days)}</p>
      </div>

      <p className="mt-3 break-words text-2xl font-bold leading-tight text-[var(--text-primary)]">
        US$ {change.usdNow.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
      </p>

      {flat ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{LABELS.flat}</p>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold" style={{ color }}>
            {change.lost ? LABELS.lost : LABELS.gained} {formatCurrency(Math.abs(change.amountArs), 'ARS', 'rounded')}
            <span className="ml-1.5 text-xs font-medium opacity-80">
              ({change.percent > 0 ? '+' : ''}{change.percent.toFixed(1)}%)
            </span>
          </p>
          <p className="mt-1 text-[0.68rem] leading-relaxed text-[var(--text-muted)]">
            {change.lost ? LABELS.lostBody : LABELS.gainedBody}
          </p>
        </>
      )}
    </div>
  )
}
