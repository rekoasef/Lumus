'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Minus, TrendingDown, TrendingUp, Wallet as WalletIcon } from 'lucide-react'
import type { FinanceCategory, FinanceSummaryRow, Wallet } from '@/types/finance.types'
import type { CreateTransactionInput, UpdateTransactionInput } from '@/lib/validations/finance'
import type { TransactionDefaults } from './transaction-form'
import { TransactionList } from './transaction-list'
import { MonthlyReportBanner } from './monthly-report-banner'
import { MonthlyReportModal } from './monthly-report-modal'
import { FinanzasPageShell } from './finanzas-page-header'
import { useWallets } from '@/hooks/use-wallets'
import { useExchangeRates } from '@/hooks/use-exchange-rates'
import { useFinanceSummary } from '@/hooks/use-finance-summary'
import { useTransactions } from '@/hooks/use-transactions'
import { useFinanceReport } from '@/hooks/use-finance-report'
import { sumSummary } from '@/lib/finance/summary'
import { formatCurrency } from '@/lib/utils/format-currency'
import { localDateStr } from '@/lib/utils/format-date'

interface MovimientosViewProps {
  initialWallets: Wallet[]
  initialCategories: FinanceCategory[]
  /** Todas las categorías, incluidas las borradas — para nombrar movimientos viejos. */
  initialCategoryLookup: Pick<FinanceCategory, 'id' | 'name' | 'color' | 'icon'>[]
  /** Agregado del mes en curso, calculado en el server. */
  initialMonthSummary: FinanceSummaryRow[]
  /** Categoría y billetera más usadas — precargan un movimiento nuevo. */
  frequentDefaults?: TransactionDefaults
}

/**
 * La pantalla de todos los días.
 *
 * Es lo único que queda en `/finanzas`: hasta este ticket convivía con
 * presupuestos, metas, billeteras, categorías e inversiones en un solo
 * componente de 786 líneas, y llegar acá costaba traer los datos de las siete
 * secciones antes de pintar nada.
 */
export function MovimientosView({
  initialWallets,
  initialCategories,
  initialCategoryLookup,
  initialMonthSummary,
  frequentDefaults,
}: MovimientosViewProps) {
  const { wallets, balanceByCurrency, setWalletBalance } = useWallets(initialWallets)
  const { rates: exchangeRates, toARS } = useExchangeRates()

  // Los totales del mes salen del agregado en SQL, no de filtrar un array de
  // transacciones: así no dependen de cuántas filas se hayan traído.
  const now = new Date()
  const monthRange = useMemo(() => ({
    from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    to: localDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  const { summary: monthSummary, refresh: refreshMonthSummary } = useFinanceSummary(monthRange, {
    initialSummary: initialMonthSummary,
  })

  const {
    loading: txLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions({
    onWalletBalance: (updatedWallets) => {
      for (const w of updatedWallets) setWalletBalance(w.id, w.balance)
    },
    onMutated: refreshMonthSummary,
  })

  // `?nuevo=gasto` viene del acceso directo de la app instalada. Se lee una
  // sola vez, al montar: si quedara vivo, cerrar el formulario lo volvería a
  // abrir.
  const searchParams = useSearchParams()
  const [openOnMount] = useState(() => {
    const nuevo = searchParams.get('nuevo')
    return nuevo === 'gasto' || nuevo === 'ingreso' ? { type: nuevo } as const : null
  })

  const [reportOpen, setReportOpen] = useState(false)
  const {
    report,
    generating,
    error: reportError,
    monthLabel: reportMonthLabel,
    available: reportAvailable,
    generate,
  } = useFinanceReport()

  // Gastos/ingresos del mes convertidos a ARS — las billeteras pueden estar
  // en distinta moneda (ARS/USD) y no se pueden sumar montos crudos entre sí
  const gastosDelMes   = useMemo(() => sumSummary(monthSummary, 'gasto', toARS), [monthSummary, toARS])
  const ingresosDelMes = useMemo(() => sumSummary(monthSummary, 'ingreso', toARS), [monthSummary, toARS])

  const fmt = (n: number, currency = 'ARS') => formatCurrency(n, currency, 'auto')

  const resto      = ingresosDelMes - gastosDelMes
  const restoColor = resto > 0 ? 'var(--success)' : resto < 0 ? 'var(--danger)' : 'var(--text-muted)'
  const restoLabel = resto > 0 ? 'Sobraste' : resto < 0 ? 'Sobregirado' : 'Equilibrado'

  const totalARSEquiv = Object.entries(balanceByCurrency).reduce(
    (sum, [currency, amount]) => sum + toARS(amount, currency),
    0,
  )
  const hasForeignCurrency = Object.keys(balanceByCurrency).some(c => c !== 'ARS')

  return (
    <FinanzasPageShell>
      {/* Banner de informe mensual — solo cuando el mes cerrado se puede
          analizar de verdad: la cuenta ya existía y tiene movimientos.
          Ver `lib/finance/report-availability.ts`. */}
      {report === null && reportAvailable && (
        <MonthlyReportBanner monthLabel={reportMonthLabel} onOpen={() => setReportOpen(true)} />
      )}

      <header className="mb-6 sm:mb-10">
        <div>
          <h1 className="lumus-heading text-3xl font-bold text-[var(--text-primary)] sm:text-4xl md:text-5xl">
            Gastos
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)] sm:mt-3 sm:text-base">
            Todo lo que entró y salió este mes.
          </p>
        </div>

        {/* Stats del mes — 4 cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">

          {/* Billeteras — breakdown por moneda + total ARS equivalente */}
          <div className="lumus-glass rounded-xl p-4">
            <div className="flex items-center gap-2">
              <WalletIcon size={14} className="text-[var(--accent-lumus)]" />
              <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">BILLETERAS</p>
            </div>

            <div className="mt-2 space-y-0.5">
              {Object.entries(balanceByCurrency).map(([currency, amount]) => (
                <p key={currency} className={`lumus-heading text-xl font-bold leading-tight ${amount >= 0 ? 'text-[var(--accent-lumus)]' : 'text-[var(--danger)]'}`}>
                  {formatCurrency(amount, currency, 'byCurrency')}
                </p>
              ))}
              {wallets.length === 0 && (
                <p className="lumus-heading text-xl font-bold text-[var(--accent-lumus)]">$0</p>
              )}
            </div>

            {hasForeignCurrency && exchangeRates && (
              <p className="mt-1 text-[0.58rem] text-[var(--text-muted)]">
                ≈ {fmt(totalARSEquiv)} ARS total
              </p>
            )}

            <p className="mt-0.5 text-[0.6rem] text-[var(--text-muted)]">
              {wallets.length} {wallets.length === 1 ? 'billetera' : 'billeteras'}
            </p>
          </div>

          {/* Ingresos del mes */}
          <div className="lumus-glass rounded-xl p-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-[var(--success)]" />
              <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">INGRESOS</p>
            </div>
            <p className="lumus-heading mt-2 text-xl font-bold text-[var(--success)]">
              {fmt(ingresosDelMes)}
            </p>
            <p className="mt-0.5 text-[0.6rem] text-[var(--text-muted)]">
              Este mes{hasForeignCurrency ? ' · convertido a ARS' : ''}
            </p>
          </div>

          {/* Gastos del mes */}
          <div className="lumus-glass rounded-xl p-4">
            <div className="flex items-center gap-2">
              <TrendingDown size={14} className="text-[var(--danger)]" />
              <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">GASTOS</p>
            </div>
            <p className="lumus-heading mt-2 text-xl font-bold text-[var(--danger)]">
              {fmt(gastosDelMes)}
            </p>
            <p className="mt-0.5 text-[0.6rem] text-[var(--text-muted)]">
              Este mes{hasForeignCurrency ? ' · convertido a ARS' : ''}
            </p>
          </div>

          {/* Resto — diferencia del mes */}
          <div className="lumus-glass rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Minus size={14} style={{ color: restoColor }} />
              <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">RESTO</p>
            </div>
            <p className="lumus-heading mt-2 text-xl font-bold" style={{ color: restoColor }}>
              {resto >= 0 ? '+' : ''}{fmt(resto)}
            </p>
            <p className="mt-0.5 text-[0.6rem]" style={{ color: restoColor }}>
              {restoLabel}
            </p>
          </div>

        </div>
      </header>

      <section className="lumus-glass rounded-2xl p-3 sm:p-6">
        <TransactionList
          mutating={txLoading}
          wallets={wallets}
          categories={initialCategories}
          categoryLookup={initialCategoryLookup}
          toARS={toARS}
          frequentDefaults={frequentDefaults}
          openOnMount={openOnMount}
          onCreate={(data: CreateTransactionInput) => createTransaction(data)}
          onUpdate={(id: string, data: UpdateTransactionInput) => updateTransaction(id, data)}
          onDelete={(id: string) => deleteTransaction(id)}
        />
      </section>

      {reportOpen && (
        <MonthlyReportModal
          report={report ?? null}
          generating={generating}
          error={reportError}
          monthLabel={reportMonthLabel}
          onGenerate={generate}
          onClose={() => setReportOpen(false)}
        />
      )}
    </FinanzasPageShell>
  )
}
