'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownLeft, ArrowUpRight, X } from 'lucide-react'
import { createLoanSchema, type CreateLoanInput } from '@/lib/validations/finance'
import type { FinanceCategory, Wallet } from '@/types/finance.types'
import type { Loan, LoanDirection } from '@/lib/finance/loans'
import { formatCurrency } from '@/lib/utils/format-currency'
import { localDateStr } from '@/lib/utils/format-date'

interface LoanFormProps {
  wallets: Wallet[]
  categories: FinanceCategory[]
  onSave: (data: CreateLoanInput) => Promise<void>
  onClose: () => void
  initial?: Loan
}

const DIRECTIONS: { value: LoanDirection; label: string; hint: string; icon: typeof ArrowDownLeft }[] = [
  { value: 'tomado',   label: 'Saqué un préstamo', hint: 'Entra plata ahora, la devolvés en cuotas', icon: ArrowDownLeft },
  { value: 'otorgado', label: 'Presté plata',      hint: 'Sale plata ahora, te la devuelven después', icon: ArrowUpRight },
]

export function LoanForm({ wallets, categories, onSave, onClose, initial }: LoanFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateLoanInput>({
    resolver: zodResolver(createLoanSchema),
    defaultValues: {
      direction:          initial?.direction          ?? 'tomado',
      counterparty:       initial?.counterparty       ?? '',
      wallet_id:          initial?.wallet_id          ?? wallets[0]?.id ?? '',
      category_id:        initial?.category_id        ?? null,
      principal:          initial?.principal          ?? undefined,
      installments:       initial?.installments       ?? undefined,
      installment_amount: initial?.installment_amount ?? undefined,
      next_due_date:      initial?.next_due_date      ?? null,
      started_on:         initial?.started_on         ?? localDateStr(),
      notes:              initial?.notes              ?? null,
    },
  })

  const direction   = watch('direction')
  const principal   = watch('principal')
  const installments = watch('installments')
  const installmentAmount = watch('installment_amount')

  const isTaken = direction === 'tomado'
  const expenseCategories = categories.filter(c => c.type === 'gasto')

  // El sobrecosto se muestra en vivo mientras se escribe: es lo que el usuario
  // vino a saber, y es la única forma de que lo vea **antes** de firmar.
  // Aritmética, no una TNA — ver `lib/finance/loans.ts`.
  const totalToRepay =
    typeof installments === 'number' && typeof installmentAmount === 'number'
      ? installments * installmentAmount
      : null

  const surcharge =
    totalToRepay !== null && typeof principal === 'number' && principal > 0
      ? ((totalToRepay - principal) / principal) * 100
      : null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="lumus-glass max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl p-5 sm:rounded-2xl sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
            {initial ? 'Editar préstamo' : 'Nuevo préstamo'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">

          {/* Dirección — no se edita después: cambiarla daría vuelta el signo
              del desembolso ya registrado. */}
          {!initial && (
            <div className="grid grid-cols-1 gap-2">
              {DIRECTIONS.map(({ value, label, hint, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('direction', value)}
                  className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    direction === value
                      ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  }`}
                >
                  <Icon size={16} className={direction === value ? 'mt-0.5 text-[var(--accent-lumus)]' : 'mt-0.5 text-[var(--text-muted)]'} />
                  <span>
                    <span className={`block text-sm font-medium ${direction === value ? 'text-[var(--accent-lumus)]' : 'text-[var(--text-primary)]'}`}>
                      {label}
                    </span>
                    <span className="block text-[0.68rem] text-[var(--text-muted)]">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              {isTaken ? 'QUIÉN TE PRESTÓ' : 'A QUIÉN LE PRESTASTE'}
            </label>
            <input
              {...register('counterparty')}
              placeholder={isTaken ? 'Ej: Banco Nación, Mercado Pago...' : 'Ej: Juan, mi hermana...'}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.counterparty && <p className="mt-1 text-xs text-[var(--danger)]">{errors.counterparty.message}</p>}
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              {isTaken ? 'CUÁNTO TE DIERON' : 'CUÁNTO PRESTASTE'}
            </label>
            <input
              type="number"
              step="0.01"
              {...register('principal', { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
            {errors.principal && <p className="mt-1 text-xs text-[var(--danger)]">{errors.principal.message}</p>}
          </div>

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              {isTaken ? 'A QUÉ BILLETERA ENTRÓ' : 'DE QUÉ BILLETERA SALIÓ'}
            </label>
            <select
              {...register('wallet_id')}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
            >
              {wallets.map(w => (
                <option key={w.id} value={w.id} className="bg-[#1d1b28]">{w.name}</option>
              ))}
            </select>
            {errors.wallet_id && <p className="mt-1 text-xs text-[var(--danger)]">{errors.wallet_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                CUOTAS {!isTaken && <span className="normal-case opacity-70">(opcional)</span>}
              </label>
              <input
                type="number"
                {...register('installments', { setValueAs: v => (v === '' ? null : Number(v)) })}
                placeholder="12"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
              />
              {errors.installments && <p className="mt-1 text-xs text-[var(--danger)]">{errors.installments.message}</p>}
            </div>
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                VALOR DE CADA UNA
              </label>
              <input
                type="number"
                step="0.01"
                {...register('installment_amount', { setValueAs: v => (v === '' ? null : Number(v)) })}
                placeholder="0.00"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
              />
              {errors.installment_amount && <p className="mt-1 text-xs text-[var(--danger)]">{errors.installment_amount.message}</p>}
            </div>
          </div>

          {!isTaken && (
            <p className="-mt-1 text-[0.68rem] text-[var(--text-muted)]">
              Si no pactaron cuotas, dejalas vacías: lo que falta se sigue por lo que te vayan devolviendo.
            </p>
          )}

          {/* Lo que el amigo pidió: "que te tire cuánto vas a pagar de más". */}
          {totalToRepay !== null && (
            <div className="rounded-xl border border-[var(--accent-lumus)]/20 bg-[var(--accent-muted)] px-4 py-3">
              <p className="text-sm text-[var(--text-primary)]">
                {isTaken ? 'Vas a devolver ' : 'Te van a devolver '}
                <strong>{formatCurrency(totalToRepay, 'ARS', 'auto')}</strong>
              </p>
              {surcharge !== null && surcharge > 0 && (
                <p className="mt-0.5 text-[0.72rem] text-[var(--accent-lumus)]">
                  Un {surcharge.toLocaleString('es-AR', { maximumFractionDigits: 1 })}% más de lo que
                  {isTaken ? ' recibís' : ' prestás'} — {formatCurrency(totalToRepay - (principal ?? 0), 'ARS', 'auto')} de diferencia
                </p>
              )}
            </div>
          )}

          {isTaken && (
            <>
              <div>
                <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                  CUÁNDO VENCE LA PRIMERA CUOTA
                </label>
                <input
                  type="date"
                  {...register('next_due_date')}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
                />
                {errors.next_due_date && <p className="mt-1 text-xs text-[var(--danger)]">{errors.next_due_date.message}</p>}
              </div>

              <div>
                <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                  CATEGORÍA DE LAS CUOTAS
                </label>
                <select
                  {...register('category_id', { setValueAs: v => (v === '' ? null : v) })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
                >
                  <option value="" className="bg-[#1d1b28]">Sin categoría</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#1d1b28]">{c.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-[0.68rem] text-[var(--text-muted)]">
                  Cada cuota se registra como gasto con esta categoría, así entra en tus presupuestos.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
              {isTaken ? 'CUÁNDO LO SACASTE' : 'CUÁNDO LO PRESTASTE'}
            </label>
            <input
              type="date"
              {...register('started_on')}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lumus)] focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : initial ? 'Guardar' : 'Crear préstamo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
