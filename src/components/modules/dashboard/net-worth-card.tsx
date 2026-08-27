import { Wallet, LineChart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'

const LABELS = {
  title: 'Patrimonio',
  wallets: 'Billeteras',
  holdings: 'Inversiones',
  noHoldings: 'Sumá tus inversiones para verlas acá.',
} as const

interface NetWorthCardProps {
  walletsArs: number
  holdingsArs: number
  arsPerUsd: number
}

/**
 * Patrimonio total: billeteras más inversiones.
 *
 * Las apps de gastos terminan donde empiezan las inversiones — el saldo de las
 * billeteras no es todo lo que tenés. Se muestran separados a propósito: una
 * cosa es la plata a la que podés echar mano y otra la que está invertida.
 */
export function NetWorthCard({ walletsArs, holdingsArs, arsPerUsd }: NetWorthCardProps) {
  const totalArs = walletsArs + holdingsArs
  const totalUsd = arsPerUsd > 0 ? totalArs / arsPerUsd : null

  return (
    <div className="lumus-glass rounded-2xl p-5">
      <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{LABELS.title}</p>

      <p className="mt-3 break-words text-2xl font-bold leading-tight text-[var(--text-primary)]">
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
      </div>

      {holdingsArs === 0 && (
        <p className="mt-3 text-[0.65rem] leading-relaxed text-[var(--text-muted)]">{LABELS.noHoldings}</p>
      )}
    </div>
  )
}
