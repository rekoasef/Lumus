'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownLeft, ArrowUpRight, History, X } from 'lucide-react'
import { createLoanSchema, type CreateLoanInput } from '@/lib/validations/finance'
import type { FinanceCategory, Wallet } from '@/types/finance.types'
import {
  installmentsFromRepaid,
  maxRepaidBeforeTracking,
  repaidFromInstallments,
  type Loan,
  type LoanDirection,
} from '@/lib/finance/loans'
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
      preexisting:        initial?.preexisting        ?? false,
      // Solo el otorgado lo edita en plata; el tomado lo recalcula desde las
      // cuotas al enviar, así que acá arranca en 0 para no validar un valor viejo.
      repaid_before_tracking: initial?.direction === 'otorgado' ? Number(initial.repaid_before_tracking) : 0,
    },
  })

  const direction   = watch('direction')
  const principal   = watch('principal')
  const installments = watch('installments')
  const installmentAmount = watch('installment_amount')

  const preexisting = watch('preexisting') ?? false
  const repaidBeforeMoney = watch('repaid_before_tracking')

  // En un préstamo tomado se pregunta en cuotas ("voy 5 de 12") y se guarda en
  // plata: la conversión la hace `repaidFromInstallments` al enviar, con el valor
  // de cuota que haya quedado. Ver `F3`.
  const [paidInstallments, setPaidInstallments] = useState<string>(() =>
    initial?.preexisting && initial.installment_amount
      ? String(installmentsFromRepaid(Number(initial.repaid_before_tracking), initial.installment_amount))
      : '',
  )
  const [paidInstallmentsError, setPaidInstallmentsError] = useState<string | null>(null)

  const isTaken = direction === 'tomado'
  /** Editando un préstamo que se cargó como nuevo: prender la opción saca su desembolso. */
  const willRemoveDisbursement = Boolean(initial && !initial.preexisting && preexisting)
  const expenseCategories = categories.filter(c => c.type === 'gasto')

  // El sobrecosto se muestra en vivo mientras se escribe: es lo que el usuario
  // vino a saber, y es la única forma de que lo vea **antes** de firmar.
  // Aritmética, no una TNA — ver `lib/finance/loans.ts`.
  const totalToRepay =
    typeof installments === 'number' && typeof installmentAmount === 'number'
      ? installments * installmentAmount
      : null

  const repaidBefore = !preexisting
    ? 0
    : isTaken
      ? typeof installmentAmount === 'number' && paidInstallments !== ''
        ? repaidFromInstallments(Number(paidInstallments), installmentAmount)
        : 0
      : typeof repaidBeforeMoney === 'number' && !Number.isNaN(repaidBeforeMoney) ? repaidBeforeMoney : 0

  const outstandingPreview = preexisting && typeof principal === 'number'
    ? Math.max(0, maxRepaidBeforeTracking({
        direction,
        principal,
        installments: installments ?? null,
        installment_amount: installmentAmount ?? null,
      }) - repaidBefore)
    : null

  function submit(data: CreateLoanInput) {
    if (!data.preexisting) {
      setPaidInstallmentsError(null)
      return onSave({ ...data, repaid_before_tracking: 0 })
    }
    if (data.direction !== 'tomado') {
      setPaidInstallmentsError(null)
      return onSave(data)
    }

    const count = paidInstallments === '' ? 0 : Number(paidInstallments)
    const total = data.installments ?? 0
    if (!Number.isInteger(count) || count < 0 || count > total) {
      setPaidInstallmentsError(`Tiene que ser un número entre 0 y ${total}`)
      return Promise.resolve()
    }
    setPaidInstallmentsError(null)
    return onSave({
      ...data,
      repaid_before_tracking: repaidFromInstallments(count, data.installment_amount ?? 0),
    })
  }

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

        <form onSubmit={handleSubmit(submit)} className="space-y-4">

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

          {/* Préstamo que ya venía corriendo (F3): no toca billeteras, porque esa
              plata se movió antes de usar Lumus y el saldo ya la refleja. */}
          <button
            type="button"
            role="switch"
            aria-checked={preexisting}
            onClick={() => {
              // Apagada, lo ya devuelto no existe: se limpia para que el
              // formulario no rechace un valor que ya no se ve.
              if (preexisting) setValue('repaid_before_tracking', 0)
              setValue('preexisting', !preexisting)
            }}
            className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
              preexisting
                ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)]'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            <History size={16} className={preexisting ? 'mt-0.5 text-[var(--accent-lumus)]' : 'mt-0.5 text-[var(--text-muted)]'} />
            <span className="flex-1">
              <span className={`block text-sm font-medium ${preexisting ? 'text-[var(--accent-lumus)]' : 'text-[var(--text-primary)]'}`}>
                {isTaken ? 'Ya lo venía pagando' : 'Ya me venían devolviendo'}
              </span>
              <span className="block text-[0.68rem] text-[var(--text-muted)]">
                Es de antes de usar Lumus: no se suma ni se resta plata de ninguna billetera.
              </span>
            </span>
            <span
              aria-hidden
              className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${preexisting ? 'bg-[var(--accent-lumus)]' : 'bg-white/15'}`}
            >
              <span className={`size-4 rounded-full bg-white transition-transform ${preexisting ? 'translate-x-4' : ''}`} />
            </span>
          </button>

          {willRemoveDisbursement && (
            <p className="-mt-1 rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-muted)] px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--text-secondary)]">
              Al guardar se {isTaken ? 'saca de' : 'devuelve a'} tu billetera {isTaken ? 'la plata que se sumó' : 'la plata que se restó'} cuando lo cargaste
              {typeof principal === 'number' ? ` (${formatCurrency(principal, 'ARS', 'auto')})` : ''}.
            </p>
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
              {preexisting
                ? isTaken ? 'DE QUÉ BILLETERA PAGÁS LAS CUOTAS' : 'A QUÉ BILLETERA TE DEVUELVEN'
                : isTaken ? 'A QUÉ BILLETERA ENTRÓ' : 'DE QUÉ BILLETERA SALIÓ'}
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

          {preexisting && isTaken && (
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                CUÁNTAS CUOTAS YA PAGASTE
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={paidInstallments}
                onChange={e => setPaidInstallments(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
              />
              {paidInstallmentsError && <p className="mt-1 text-xs text-[var(--danger)]">{paidInstallmentsError}</p>}
            </div>
          )}

          {preexisting && !isTaken && (
            <div>
              <label className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                CUÁNTO TE DEVOLVIERON YA
              </label>
              <input
                type="number"
                step="0.01"
                {...register('repaid_before_tracking', { setValueAs: v => (v === '' ? 0 : Number(v)) })}
                placeholder="0.00"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)] focus:outline-none"
              />
              {errors.repaid_before_tracking && <p className="mt-1 text-xs text-[var(--danger)]">{errors.repaid_before_tracking.message}</p>}
            </div>
          )}

          {outstandingPreview !== null && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-sm text-[var(--text-primary)]">
                {isTaken ? 'Te falta pagar ' : 'Te falta cobrar '}
                <strong>{formatCurrency(outstandingPreview, 'ARS', 'auto')}</strong>
              </p>
              <p className="mt-0.5 text-[0.7rem] text-[var(--text-muted)]">
                Suma a {isTaken ? 'lo que debés' : 'lo que te deben'} en tu patrimonio, sin mover ninguna billetera.
              </p>
            </div>
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
                  {preexisting ? 'CUÁNDO VENCE LA PRÓXIMA CUOTA' : 'CUÁNDO VENCE LA PRIMERA CUOTA'}
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
