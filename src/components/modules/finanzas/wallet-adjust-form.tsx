'use client'

import { useState } from 'react'
import { X, SlidersHorizontal, TrendingUp, ArrowDownLeft, ArrowUpRight, Minus } from 'lucide-react'
import type { Wallet } from '@/types/finance.types'
import { formatCurrency } from '@/lib/utils/format-currency'
import { splitBalanceChange, isNegligible } from '@/lib/finance/investment'

/** Qué pasó con la plata, además de lo que haya rendido. */
type MovementKind = 'nada' | 'aporte' | 'retiro'

const MOVEMENT_OPTIONS: { value: MovementKind; label: string; icon: React.ReactNode }[] = [
  { value: 'nada',   label: 'Nada',  icon: <Minus size={13} /> },
  { value: 'aporte', label: 'Puse',  icon: <ArrowDownLeft size={13} /> },
  { value: 'retiro', label: 'Saqué', icon: <ArrowUpRight size={13} /> },
]

const COPY = {
  title:            'Ajustar balance',
  investmentTitle:  'Actualizar inversión',
  currentBalance:   'Balance actual',
  newBalanceLabel:  'BALANCE REAL',
  newBalanceInvest: 'SALDO NUEVO',
  movementQuestion: '¿PUSISTE O SACASTE PLATA?',
  movementAmount:   'CUÁNTO',
  fromWallet:       'DE QUÉ BILLETERA SALIÓ',
  toWallet:         'A QUÉ BILLETERA FUE',
  outsideApp:       'De afuera de la app',
  noteLabel:        'MOTIVO',
  noteOptional:     '(opcional)',
  notePlaceholder:  'Ej: Corrección de saldo real',
  contribution:     'Aporte',
  withdrawal:       'Retiro',
  gain:             'Rendimiento',
  loss:             'Pérdida',
  neutralNote:      'Queda en el historial y no impacta ingresos ni gastos.',
  // Cada caso se explica a sí mismo: hablar del aporte cuando no hubo aporte
  // confunde más que no decir nada.
  movementNote:     'El aporte no cuenta como ganancia: es la misma plata cambiando de lugar.',
  yieldOnlyNote:    'Se guarda como rendimiento de la inversión, no como ingreso.',
  cancel:           'Cancelar',
  confirm:          'Confirmar ajuste',
  confirmInvest:    'Guardar',
  saving:           'Guardando...',
} as const

export interface WalletAdjustSubmit {
  newBalance: number
  note: string
  movement: number
  counterpartWalletId: string | null
}

interface WalletAdjustFormProps {
  wallet: Wallet
  /** El resto de las billeteras, para decir de dónde salió el aporte. */
  wallets: Wallet[]
  onAdjust: (input: WalletAdjustSubmit) => Promise<void>
  onClose: () => void
}

export function WalletAdjustForm({ wallet, wallets, onAdjust, onClose }: WalletAdjustFormProps) {
  const isInvestment = wallet.type === 'inversion'

  const [newBalance, setNewBalance] = useState<string>(String(wallet.balance))
  const [note, setNote] = useState('')
  const [movementKind, setMovementKind] = useState<MovementKind>('nada')
  const [movementAmount, setMovementAmount] = useState<string>('')
  const [counterpart, setCounterpart] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const parsed = parseFloat(newBalance)
  const isValid = !isNaN(parsed)

  const rawMovement = parseFloat(movementAmount)
  const movementValue = isNaN(rawMovement) ? 0 : Math.abs(rawMovement)
  const movement = movementKind === 'aporte' ? movementValue
    : movementKind === 'retiro' ? -movementValue
    : 0

  // El reparto lo hace la misma función que usa la API, así que la pantalla no
  // puede prometer un número distinto del que se guarda.
  const { yield: yieldAmount } = splitBalanceChange(wallet.balance, isValid ? parsed : wallet.balance, movement)

  const diff = isValid ? parsed - wallet.balance : 0
  const changed = !isNegligible(diff) || !isNegligible(movement)

  const fmt = (n: number) => formatCurrency(n, wallet.currency, 'rounded')

  // La contraparte solo tiene sentido para las otras billeteras del usuario.
  const otherWallets = wallets.filter(w => w.id !== wallet.id && w.currency === wallet.currency)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !changed) return
    setLoading(true)
    await onAdjust({
      newBalance: parsed,
      note,
      movement,
      counterpartWalletId: counterpart || null,
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass w-full max-w-sm rounded-t-2xl rounded-b-none p-5 max-h-[92vh] overflow-y-auto sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              {isInvestment
                ? <TrendingUp size={15} className="text-[var(--accent-lumus)]" />
                : <SlidersHorizontal size={15} className="text-[var(--accent-lumus)]" />}
            </div>
            <div>
              <h2 className="lumus-heading text-base font-semibold text-[var(--text-primary)]">
                {isInvestment ? COPY.investmentTitle : COPY.title}
              </h2>
              <p className="text-[0.65rem] text-[var(--text-muted)]">{wallet.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Balance actual */}
          <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
            <span className="text-xs text-[var(--text-muted)]">{COPY.currentBalance}</span>
            <span className="lumus-heading text-base font-bold text-[var(--text-primary)]">
              {fmt(wallet.balance)}
            </span>
          </div>

          {/* Nuevo balance */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              {isInvestment ? COPY.newBalanceInvest : COPY.newBalanceLabel}
            </label>
            <input
              type="number"
              step="0.01"
              value={newBalance}
              onChange={e => setNewBalance(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
          </div>

          {/* ── Solo en inversiones: por qué cambió ── */}
          {isInvestment && (
            <>
              <div>
                <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                  {COPY.movementQuestion}
                </label>
                <div className="flex gap-2">
                  {MOVEMENT_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setMovementKind(option.value)
                        if (option.value === 'nada') { setMovementAmount(''); setCounterpart('') }
                      }}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                        movementKind === option.value
                          ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                          : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                      }`}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {movementKind !== 'nada' && (
                <div className="space-y-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  <div>
                    <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                      {COPY.movementAmount}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={movementAmount}
                      onChange={e => setMovementAmount(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
                    />
                  </div>

                  {otherWallets.length > 0 && (
                    <div>
                      <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                        {movementKind === 'aporte' ? COPY.fromWallet : COPY.toWallet}
                      </label>
                      <select
                        value={counterpart}
                        onChange={e => setCounterpart(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
                      >
                        <option value="">{COPY.outsideApp}</option>
                        {otherWallets.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* El reparto, en vivo. Es el punto entero de la pantalla: ver qué
              parte del cambio es plata que pusiste y qué parte ganó sola. */}
          {changed && isValid && isInvestment && (
            <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              {!isNegligible(movement) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {movement > 0 ? COPY.contribution : COPY.withdrawal}
                  </span>
                  <span className="lumus-heading font-semibold text-[var(--text-primary)]">
                    {movement > 0 ? '+' : '−'}{fmt(Math.abs(movement))}
                  </span>
                </div>
              )}

              {!isNegligible(yieldAmount) && (
                <div className="flex items-center justify-between text-sm">
                  <span className={`text-xs ${yieldAmount > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {yieldAmount > 0 ? COPY.gain : COPY.loss}
                  </span>
                  <span className={`lumus-heading font-bold ${yieldAmount > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {yieldAmount > 0 ? '+' : '−'}{fmt(Math.abs(yieldAmount))}
                  </span>
                </div>
              )}

              <p className="text-[0.65rem] leading-relaxed text-[var(--text-muted)]">
                {isNegligible(movement) ? COPY.yieldOnlyNote : COPY.movementNote}
              </p>
            </div>
          )}

          {/* Billetera común: el ajuste de toda la vida */}
          {changed && isValid && !isInvestment && (
            <div className={`rounded-lg px-3 py-2.5 text-sm ${
              diff > 0
                ? 'bg-[var(--success)]/10 text-[var(--success)]'
                : 'bg-[var(--danger)]/10 text-[var(--danger)]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs">
                  {diff > 0 ? 'Ajuste positivo de saldo' : 'Ajuste negativo de saldo'}
                </span>
                <span className="lumus-heading font-bold">
                  {diff > 0 ? '+' : ''}{fmt(diff)}
                </span>
              </div>
              <p className="mt-1 text-[0.65rem] opacity-80">{COPY.neutralNote}</p>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              {COPY.noteLabel} <span className="normal-case text-[var(--text-muted)]">{COPY.noteOptional}</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={COPY.notePlaceholder}
              maxLength={200}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-white/5"
            >
              {COPY.cancel}
            </button>
            <button
              type="submit"
              disabled={!changed || !isValid || loading}
              className="flex-1 rounded-lg bg-[var(--accent-lumus)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
            >
              {loading ? COPY.saving : isInvestment ? COPY.confirmInvest : COPY.confirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
