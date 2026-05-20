'use client'

import { Pencil, Trash2, Wallet, Building2, Smartphone, SlidersHorizontal } from 'lucide-react'
import type { Wallet as WalletType } from '@/types/finance.types'

const WALLET_ICONS: Record<string, React.ReactNode> = {
  efectivo: <Wallet size={18} />,
  banco:    <Building2 size={18} />,
  virtual:  <Smartphone size={18} />,
}

const WALLET_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  banco:    'Banco',
  virtual:  'Virtual',
}

interface WalletCardProps {
  wallet: WalletType
  onEdit: (wallet: WalletType) => void
  onAdjust: (wallet: WalletType) => void
  onDelete: (id: string) => void
}

export function WalletCard({ wallet, onEdit, onAdjust, onDelete }: WalletCardProps) {
  const formattedBalance = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: wallet.currency,
    minimumFractionDigits: 2,
  }).format(wallet.balance)

  return (
    <div className="lumus-glass group relative rounded-xl p-5 transition-all hover:border-white/15">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${wallet.color}22`, color: wallet.color }}
          >
            {WALLET_ICONS[wallet.type]}
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
        <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">BALANCE</p>
        <p
          className="lumus-heading mt-1 text-2xl font-bold"
          style={{ color: wallet.balance >= 0 ? wallet.color : 'var(--danger)' }}
        >
          {formattedBalance}
        </p>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl opacity-40"
        style={{ backgroundColor: wallet.color }}
      />
    </div>
  )
}
