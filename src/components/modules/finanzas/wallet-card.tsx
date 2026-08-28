'use client'

import { Pencil, Trash2, Wallet, Building2, Smartphone, SlidersHorizontal, TrendingUp } from 'lucide-react'
import { CategoryIcon } from '@/lib/utils/category-icons'
import type { Wallet as WalletType } from '@/types/finance.types'
import { formatCurrency } from '@/lib/utils/format-currency'
import type { InvestmentReturn, InvestmentReturnUsd } from '@/lib/finance/investment'

const WALLET_ICONS: Record<string, React.ReactNode> = {
  efectivo:  <Wallet size={18} />,
  banco:     <Building2 size={18} />,
  virtual:   <Smartphone size={18} />,
  inversion: <TrendingUp size={18} />,
}

const WALLET_LABELS: Record<string, string> = {
  efectivo:  'Efectivo',
  banco:     'Banco',
  virtual:   'Virtual',
  inversion: 'Inversión',
}

const COPY = {
  balance:      'BALANCE',
  yield:        'Rendimiento',
  inUsd:        'En dólares',
  invested:     'Invertido',
} as const

/** Un porcentaje con signo y una coma decimal, como se lee en español. */
function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`
}

interface WalletCardProps {
  wallet: WalletType
  /** Solo en billeteras de inversión. `usd` es null si falta alguna cotización. */
  investment?: { ars: InvestmentReturn; usd: InvestmentReturnUsd | null } | null
  onEdit: (wallet: WalletType) => void
  onAdjust: (wallet: WalletType) => void
  onDelete: (id: string) => void
}

export function WalletCard({ wallet, investment, onEdit, onAdjust, onDelete }: WalletCardProps) {
  const formattedBalance = formatCurrency(wallet.balance, wallet.currency, 'exact')

  return (
    <div className="lumus-glass group relative rounded-xl p-5 transition-all hover:border-white/15">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${wallet.color}22`, color: wallet.color }}
          >
            {/* El ícono elegido a mano pisa al del tipo de billetera. */}
            {wallet.icon
              ? <CategoryIcon icon={wallet.icon} size={17} />
              : WALLET_ICONS[wallet.type]}
          </div>
          <div>
            <p className="lumus-heading text-sm font-semibold text-[var(--text-primary)]">
              {wallet.name}
            </p>
            <p className="lumus-label mt-0.5 text-[0.6rem] text-[var(--text-muted)]">
              {WALLET_LABELS[wallet.type]}
            </p>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onAdjust(wallet)}
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent-lumus)]"
            aria-label="Ajustar balance"
            title="Ajustar balance"
          >
            <SlidersHorizontal size={14} />
          </button>
          <button
            onClick={() => onEdit(wallet)}
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
            aria-label="Editar billetera"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(wallet.id)}
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            aria-label="Eliminar billetera"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-5">
        <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">{COPY.balance}</p>
        <p
          className="lumus-heading mt-1 text-2xl font-bold"
          style={{ color: wallet.balance >= 0 ? wallet.color : 'var(--danger)' }}
        >
          {formattedBalance}
        </p>
      </div>

      {/* En una inversión el saldo solo no dice nada: lo que importa es qué
          parte de ese número es plata que pusiste y qué parte ganó sola. Y en
          pesos tampoco alcanza — ganar 20% con el dólar 30% arriba es perder. */}
      {investment && (
        <div className="mt-4 space-y-1.5 border-t border-white/[0.07] pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[0.7rem] text-[var(--text-secondary)]">{COPY.yield}</span>
            <span
              className={`lumus-heading text-sm font-bold ${
                investment.ars.returnArs >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
              }`}
            >
              {investment.ars.returnArs > 0 ? '+' : investment.ars.returnArs < 0 ? '−' : ''}
              {formatCurrency(Math.abs(investment.ars.returnArs), wallet.currency, 'rounded')}
              {investment.ars.percent !== null && (
                <span className="ml-1.5 text-[0.7rem] font-medium opacity-80">
                  {formatPercent(investment.ars.percent)}
                </span>
              )}
            </span>
          </div>

          {investment.usd && (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[0.7rem] text-[var(--text-muted)]">{COPY.inUsd}</span>
              <span
                className={`text-[0.7rem] font-medium ${
                  investment.usd.returnUsd >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                } opacity-90`}
              >
                {investment.usd.returnUsd > 0 ? '+' : investment.usd.returnUsd < 0 ? '−' : ''}
                {formatCurrency(Math.abs(investment.usd.returnUsd), 'USD', 'rounded')}
                {investment.usd.percent !== null && (
                  <span className="ml-1.5 opacity-80">{formatPercent(investment.usd.percent)}</span>
                )}
              </span>
            </div>
          )}

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[0.7rem] text-[var(--text-muted)]">{COPY.invested}</span>
            <span className="text-[0.7rem] text-[var(--text-secondary)]">
              {formatCurrency(investment.ars.investedArs, wallet.currency, 'rounded')}
            </span>
          </div>
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl opacity-40"
        style={{ backgroundColor: wallet.color }}
      />
    </div>
  )
}
