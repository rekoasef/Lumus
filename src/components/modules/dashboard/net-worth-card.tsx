import { Wallet, LineChart, HandCoins, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'

const LABELS = {
  title: 'Patrimonio',
  wallets: 'Billeteras',
  holdings: 'Inversiones',
  receivable: 'Te deben',
  debt: 'Debés',
  noHoldings: 'Sumá tus inversiones para verlas acá.',
} as const

interface NetWorthCardProps {
  walletsArs: number
  holdingsArs: number
  /** Lo que prestaste y falta cobrar. Suma: es plata tuya, en otro lado. */
  receivableArs?: number
  /** Lo que debés. **Resta** — es lo único del patrimonio que va para abajo. */
  debtArs?: number
  arsPerUsd: number
}

/**
 * Patrimonio total: billeteras, inversiones, lo que te deben y lo que debés.
 *
 * Las apps de gastos terminan donde empiezan las inversiones — el saldo de las
 * billeteras no es todo lo que tenés. Se muestran separados a propósito: una
 * cosa es la plata a la que podés echar mano y otra la que está invertida.
 *
 * La deuda es la única línea que resta, y llegó con los préstamos. Antes de eso
 * el patrimonio era una suma de cosas positivas, y sacar un préstamo hacía que
 * Lumus te felicitara por endeudarte.
 */
export function NetWorthCard({
  walletsArs,
  holdingsArs,
  receivableArs = 0,
  debtArs = 0,
  arsPerUsd,
}: NetWorthCardProps) {
  const totalArs = walletsArs + holdingsArs + receivableArs - debtArs
  const totalUsd = arsPerUsd > 0 ? totalArs / arsPerUsd : null

  return (
    <div className="lumus-glass rounded-2xl p-5">
      <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{LABELS.title}</p>

      <p
        className="mt-3 break-words text-2xl font-bold leading-tight"
        style={{ color: totalArs < 0 ? 'var(--danger)' : 'var(--text-primary)' }}
      >
        {formatCurrency(totalArs, 'ARS', 'rounded')}
      </p>
      {totalUsd !== null && (
        <p className="mt-1 text-[0.68rem] text-[var(--text-muted)]">
          US$ {totalUsd.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
        </p>
      )}

      <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[0.7rem] text-[var(--text-secondary)]">
            <Wallet size={12} className="text-[var(--text-muted)]" /> {LABELS.wallets}
          </span>
          <span className="text-[0.72rem] font-medium text-[var(--text-primary)]">
            {formatCurrency(walletsArs, 'ARS', 'rounded')}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[0.7rem] text-[var(--text-secondary)]">
            <LineChart size={12} className="text-[var(--text-muted)]" /> {LABELS.holdings}
          </span>
          <span className="text-[0.72rem] font-medium text-[var(--text-primary)]">
            {holdingsArs > 0
              ? formatCurrency(holdingsArs, 'ARS', 'rounded')
              : <span className="text-[var(--text-muted)]">—</span>}
          </span>
        </div>

        {/* Las dos líneas de préstamos solo aparecen si hay algo que mostrar:
            a quien nunca prestó ni debe no le sirve ver dos ceros. */}
        {receivableArs > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[0.7rem] text-[var(--text-secondary)]">
              <HandCoins size={12} className="text-[var(--text-muted)]" /> {LABELS.receivable}
            </span>
            <span className="text-[0.72rem] font-medium text-[var(--text-primary)]">
              {formatCurrency(receivableArs, 'ARS', 'rounded')}
            </span>
          </div>
        )}
        {debtArs > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[0.7rem] text-[var(--text-secondary)]">
              <TrendingDown size={12} className="text-[var(--danger)]" /> {LABELS.debt}
            </span>
            <span className="text-[0.72rem] font-medium text-[var(--danger)]">
              −{formatCurrency(debtArs, 'ARS', 'rounded')}
            </span>
          </div>
        )}
      </div>

      {holdingsArs === 0 && (
        <p className="mt-3 text-[0.65rem] leading-relaxed text-[var(--text-muted)]">{LABELS.noHoldings}</p>
      )}
    </div>
  )
}
