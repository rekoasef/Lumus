'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, TrendingUp, TrendingDown, Wallet as WalletIcon, ChevronLeft, ChevronRight, BarChart2, Minus } from 'lucide-react'
import type { Wallet, FinanceCategory, Budget, SavingGoal, FinanceSummaryRow } from '@/types/finance.types'

/** Fecha local en YYYY-MM-DD — `toISOString()` corre el día por la zona horaria. */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
import type { TransactionDefaults } from './transaction-form'
import { HoldingsSection } from './holdings-section'
import { InvestmentWalletsSection } from './investment-wallets-section'
import type { Holding } from '@/lib/finance/holdings'
import type { DailyRate } from '@/lib/finance/purchasing-power'
import { WalletCard } from './wallet-card'
import { WalletForm } from './wallet-form'
import { WalletAdjustForm, type WalletAdjustSubmit } from './wallet-adjust-form'
import { CategoryList } from './category-list'
import { TransactionList } from './transaction-list'
import { BudgetCard } from './budget-card'
import { BudgetForm } from './budget-form'
import { SavingGoalCard } from './saving-goal-card'
import { SavingGoalForm } from './saving-goal-form'
import { RecurringTransactionList } from './recurring-transaction-list'
import { useWallets } from '@/hooks/use-wallets'
import { useBudgets } from '@/hooks/use-budgets'
import { useSavingGoals } from '@/hooks/use-saving-goals'
import { useExchangeRates } from '@/hooks/use-exchange-rates'
import { formatCurrency } from '@/lib/utils/format-currency'
import { useTransactions } from '@/hooks/use-transactions'
import { useFinanceSummary } from '@/hooks/use-finance-summary'
import { sumSummary } from '@/lib/finance/summary'
import { useFinanceReport } from '@/hooks/use-finance-report'
import { MonthlyReportBanner } from './monthly-report-banner'
import { MonthlyReportModal } from './monthly-report-modal'
import type { CreateWalletInput, UpdateWalletInput, CreateBudgetInput, CreateSavingGoalInput, UpdateTransactionInput } from '@/lib/validations/finance'
import type { RecurringTransaction } from '@/types/finance.types'
import type { CreateTransactionInput } from '@/lib/validations/finance'
import {
  investmentReturn,
  investmentReturnUsd,
  movementsOf,
  type InvestmentEvent,
} from '@/lib/finance/investment'
import { confirm } from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface FinanzasDashboardProps {
  initialWallets: Wallet[]
  initialCategories: FinanceCategory[]
  /** Todas las categorías, incluidas las borradas — para nombrar movimientos viejos. */
  initialCategoryLookup: Pick<FinanceCategory, 'id' | 'name' | 'color' | 'icon'>[]
  /** Agregado del mes en curso, calculado en el server. */
  initialMonthSummary: FinanceSummaryRow[]
  initialBudgets: Budget[]
  initialGoals: SavingGoal[]
  initialRecurring: RecurringTransaction[]
  /** Categoría y billetera más usadas — precargan un movimiento nuevo. */
  frequentDefaults?: TransactionDefaults
  initialHoldings: Holding[]
  /** Precios de cripto en USD, resueltos en el server. */
  cryptoPrices: Record<string, number>
  /** Historia de cotizaciones, para valuar el costo de las compras en pesos. */
  rateHistory: DailyRate[]
  /** Aportes, retiros y rendimientos de cada inversión, por id de billetera. */
  initialInvestmentEvents: Record<string, InvestmentEvent[]>
}

type Section = 'transacciones' | 'billeteras' | 'categorias' | 'presupuestos' | 'metas' | 'recurrentes' | 'inversiones'

const SECTION_IDS: readonly Section[] = [
  'transacciones', 'billeteras', 'categorias', 'presupuestos', 'metas', 'recurrentes', 'inversiones',
]

function parseSection(value: string | null): Section | null {
  return value && SECTION_IDS.includes(value as Section) ? (value as Section) : null
}


export function FinanzasDashboard({
  initialWallets,
  initialCategories,
  initialCategoryLookup,
  initialMonthSummary,
  initialBudgets,
  initialGoals,
  initialRecurring,
  frequentDefaults,
  initialHoldings,
  cryptoPrices,
  rateHistory,
  initialInvestmentEvents,
}: FinanzasDashboardProps) {
  const { wallets, totalBalance: _totalBalance, balanceByCurrency, loading, createWallet, updateWallet, adjustBalance, deleteWallet, localUpdateBalance: _localUpdateBalance, setWalletBalance } =
    useWallets(initialWallets)
  const { rates: exchangeRates, toARS } = useExchangeRates()

  // Los totales del mes salen del agregado en SQL, no de filtrar un array de
  // transacciones: así no dependen de cuántas filas se hayan traído.
  const now = new Date()
  const monthFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthTo = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  const monthRange = { from: monthFrom, to: monthTo }

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
  // Lo que le fue pasando a cada inversión. Se guarda acá y no se relee del
  // server en cada ajuste: lo que se acaba de registrar vuelve en la respuesta.
  const [investmentEvents, setInvestmentEvents] =
    useState<Record<string, InvestmentEvent[]>>(initialInvestmentEvents)

  const investmentWallets = useMemo(
    () => wallets.filter(w => w.type === 'inversion'),
    [wallets],
  )

  // El rendimiento de cada inversión, en pesos y en dólares. La cuenta vive en
  // `lib/finance/investment.ts`: acá solo se le pasan los datos.
  const investmentReturns = useMemo(() => {
    const today = toLocalDateStr(new Date())

    return Object.fromEntries(
      investmentWallets
        .filter(w => w.investment_baseline !== null)
        .map(w => {
          const movements = movementsOf(investmentEvents[w.id] ?? [])
          const baseline = w.investment_baseline ?? 0
          const ars = investmentReturn(w.balance, baseline, movements)

          // Solo tiene sentido para lo que está en pesos: una inversión en
          // dólares ya está medida en la vara con la que se la quiere medir.
          const usd = w.currency === 'ARS' && w.investment_baseline_date
            ? investmentReturnUsd(w.balance, baseline, w.investment_baseline_date, movements, rateHistory, today)
            : null

          return [w.id, { ars, usd }] as const
        }),
    )
  }, [investmentWallets, investmentEvents, rateHistory])

  const [showWalletForm, setShowWalletForm] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [adjustingWallet, setAdjustingWallet] = useState<Wallet | null>(null)
  // La sección vive en estado local para que cambiar de pestaña no dispare una
  // vuelta al server. Pero se puede entrar apuntando a una: `?seccion=metas`
  // es lo que hace que un aviso del centro de notificaciones aterrice donde
  // corresponde, y no siempre en Movimientos.
  const searchParams = useSearchParams()
  const sectionParam = parseSection(searchParams.get('seccion'))
  const [activeSection, setActiveSection] = useState<Section>(sectionParam ?? 'transacciones')
  const [lastSectionParam, setLastSectionParam] = useState(sectionParam)

  // Ajuste durante el render, no en un efecto: si el parámetro cambia estando
  // ya en la pantalla (venís de un aviso y ya estabas acá), la pestaña tiene
  // que seguirlo sin un render intermedio mostrando la anterior.
  if (sectionParam !== lastSectionParam) {
    setLastSectionParam(sectionParam)
    if (sectionParam) setActiveSection(sectionParam)
  }

  // `?nuevo=gasto` viene del acceso directo de la app instalada. Se lee una
  // sola vez, al montar: si quedara vivo, cerrar el formulario y cambiar de
  // pestaña lo volvería a abrir.
  const [openOnMount] = useState(() => {
    const nuevo = searchParams.get('nuevo')
    return nuevo === 'gasto' || nuevo === 'ingreso' ? { type: nuevo } as const : null
  })

  const { budgets, month, year, loading: budgetsLoading, autoCopied, refresh: refreshBudgets, createBudget, updateBudget, deleteBudget } =
    useBudgets(initialBudgets, now.getMonth() + 1, now.getFullYear())
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  const { goals, loading: goalsLoading, createGoal, updateGoal, deleteGoal, contribute, markAchieved } =
    useSavingGoals(initialGoals)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null)

  const [reportOpen, setReportOpen] = useState(false)
  const { report, generating, error: reportError, prevMonthLabel, generate } = useFinanceReport()

  // Gastos/ingresos del mes convertidos a ARS — las billeteras pueden estar
  // en distinta moneda (ARS/USD) y no se pueden sumar montos crudos entre sí
  const gastosDelMes   = useMemo(() => sumSummary(monthSummary, 'gasto', toARS), [monthSummary, toARS])
  const ingresosDelMes = useMemo(() => sumSummary(monthSummary, 'ingreso', toARS), [monthSummary, toARS])

  async function handleTransactionCreate(data: CreateTransactionInput) {
    return createTransaction(data)
  }

  async function handleTransactionUpdate(id: string, data: UpdateTransactionInput) {
    return updateTransaction(id, data)
  }

  async function handleTransactionDelete(id: string) {
    return deleteTransaction(id)
  }

  const fmt = (n: number, currency = 'ARS') => formatCurrency(n, currency, 'auto')

  async function handleSaveWallet(data: CreateWalletInput) {
    if (editingWallet) {
      const { balance: _b, ...updateData } = data
      await updateWallet(editingWallet.id, updateData as UpdateWalletInput)
      toast.success('Billetera actualizada')
    } else {
      await createWallet(data)
      toast.success('Billetera creada')
    }
    setShowWalletForm(false)
    setEditingWallet(null)
  }

  async function handleAdjustBalance(input: WalletAdjustSubmit) {
    if (!adjustingWallet) return
    const walletId = adjustingWallet.id

    const result = await adjustBalance(walletId, {
      newBalance: input.newBalance,
      note: input.note,
      movement: input.movement,
      counterpartWalletId: input.counterpartWalletId,
    })

    // Un aporte cambia el capital invertido y un rendimiento suma al historial:
    // los dos tienen que verse ya, no en la próxima recarga.
    if (result?.events.length) {
      const events = result.events
      setInvestmentEvents(prev => ({
        ...prev,
        [walletId]: [...(prev[walletId] ?? []), ...events],
      }))
    }

    setAdjustingWallet(null)
    toast.success('Balance actualizado')
  }

  async function handleDeleteWallet(id: string) {
    const ok = await confirm({
      title: 'Eliminar billetera',
      description: 'Las transacciones asociadas quedarán sin billetera asignada. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    await deleteWallet(id)
    toast.success('Billetera eliminada')
  }

  function handleEditWallet(wallet: Wallet) {
    setEditingWallet(wallet)
    setShowWalletForm(true)
  }

  function handleAdjustWallet(wallet: Wallet) {
    setAdjustingWallet(wallet)
  }

  async function handleSaveBudget(data: CreateBudgetInput) {
    if (editingBudget) {
      await updateBudget(editingBudget.id, { amount: data.amount })
      toast.success('Presupuesto actualizado')
    } else {
      await createBudget(data)
      toast.success('Presupuesto creado')
    }
    setShowBudgetForm(false)
    setEditingBudget(null)
  }

  function handleEditBudget(budget: Budget) {
    setEditingBudget(budget)
    setShowBudgetForm(true)
  }

  async function handleDeleteBudget(id: string) {
    const ok = await confirm({ description: '¿Eliminar este presupuesto?' })
    if (!ok) return
    await deleteBudget(id)
    toast.success('Presupuesto eliminado')
  }

  function navigateMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    refreshBudgets(m, y)
  }

  async function handleSaveGoal(data: CreateSavingGoalInput) {
    if (editingGoal) {
      await updateGoal(editingGoal.id, data)
      toast.success('Meta actualizada')
    } else {
      await createGoal(data)
      toast.success('Meta creada')
    }
    setShowGoalForm(false)
    setEditingGoal(null)
  }

  function handleEditGoal(g: SavingGoal) {
    setEditingGoal(g)
    setShowGoalForm(true)
  }

  async function handleDeleteGoal(id: string) {
    const ok = await confirm({ description: '¿Eliminar esta meta de ahorro?' })
    if (!ok) return
    await deleteGoal(id)
    toast.success('Meta eliminada')
  }

  const SECTIONS: { id: Section; label: string }[] = [
    { id: 'transacciones', label: 'Movimientos' },
    { id: 'recurrentes',   label: 'Fijos' },
    { id: 'billeteras',    label: 'Billeteras' },
    { id: 'categorias',    label: 'Categorías' },
    { id: 'presupuestos',  label: 'Presupuestos' },
    { id: 'metas',         label: 'Metas' },
    { id: 'inversiones',   label: 'Inversiones' },
  ]

  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 sm:py-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[1120px]">

        {/* Banner de informe mensual — aparece cuando no hay informe del mes anterior */}
        {report === null && (
          <MonthlyReportBanner
            monthLabel={prevMonthLabel}
            onOpen={() => setReportOpen(true)}
          />
        )}

        {/* Header */}
        <header className="mb-6 sm:mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="lumus-heading text-3xl font-bold text-[var(--text-primary)] sm:text-4xl md:text-5xl">
                Finanzas
              </h1>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)] sm:mt-3 sm:text-base">
                Controlá tus billeteras, gastos e ingresos.
              </p>
            </div>
            <Link
              href="/finanzas/reportes"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-white/20 hover:text-[var(--text-secondary)]"
            >
              <BarChart2 size={12} />
              <span className="hidden sm:inline">Ver reportes</span>
              <span className="sm:hidden">Reportes</span>
            </Link>
          </div>

          {/* Stats del mes — 4 cards */}
          {(() => {
            const resto      = ingresosDelMes - gastosDelMes
            const restoColor = resto > 0 ? 'var(--success)' : resto < 0 ? 'var(--danger)' : 'var(--text-muted)'
            const restoLabel = resto > 0 ? 'Sobraste' : resto < 0 ? 'Sobregirado' : 'Equilibrado'

            // Total equivalente en ARS usando cotizaciones
            const totalARSEquiv = Object.entries(balanceByCurrency).reduce((sum, [currency, amount]) => {
              return sum + toARS(amount, currency)
            }, 0)

            const hasForeignCurrency = Object.keys(balanceByCurrency).some(c => c !== 'ARS')

            return (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">

                {/* Billeteras — breakdown por moneda + total ARS equivalente */}
                <div className="lumus-glass rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <WalletIcon size={14} className="text-[var(--accent-lumus)]" />
                    <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">BILLETERAS</p>
                  </div>

                  {/* Una línea por moneda */}
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

                  {/* Total en ARS equivalente (solo si hay moneda extranjera) */}
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
            )
          })()}
        </header>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 sm:mb-6 sm:w-fit scrollbar-hide">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-shrink-0 rounded-lg px-4 py-2 text-xs font-medium transition-colors sm:px-5 sm:text-sm ${
                activeSection === s.id
                  ? 'bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Movimientos */}
        {activeSection === 'transacciones' && (
          <section className="lumus-glass rounded-2xl p-3 sm:p-6">
            <h2 className="lumus-heading mb-4 px-1 text-lg font-semibold text-[var(--text-primary)] sm:mb-5 sm:text-xl">
              Movimientos
            </h2>
            <TransactionList
              mutating={txLoading}
              wallets={wallets}
              categories={initialCategories}
              categoryLookup={initialCategoryLookup}
              toARS={toARS}
              frequentDefaults={frequentDefaults}
              openOnMount={openOnMount}
              onCreate={handleTransactionCreate}
              onUpdate={handleTransactionUpdate}
              onDelete={handleTransactionDelete}
            />
          </section>
        )}

        {/* Recurrentes */}
        {activeSection === 'recurrentes' && (
          <section className="lumus-glass rounded-2xl p-3 sm:p-6">
            <RecurringTransactionList
              initialRecurring={initialRecurring}
              wallets={wallets}
              categories={initialCategories}
              onTransactionApplied={(_tx, wallet) => {
                if (wallet) setWalletBalance(wallet.id, wallet.balance)
                void refreshMonthSummary()
              }}
            />
          </section>
        )}

        {/* Billeteras */}
        {activeSection === 'billeteras' && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
                Mis billeteras
              </h2>
              <button
                onClick={() => { setEditingWallet(null); setShowWalletForm(true) }}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                <Plus size={16} />
                Nueva billetera
              </button>
            </div>
            {wallets.length === 0 ? (
              <div className="lumus-glass rounded-2xl py-20 text-center">
                <p className="text-[var(--text-muted)]">Todavía no tenés billeteras.</p>
                <button
                  onClick={() => setShowWalletForm(true)}
                  className="mt-4 text-sm text-[var(--accent-lumus)] hover:underline"
                >
                  Crear tu primera billetera
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {wallets.map(wallet => (
                  <WalletCard
                    key={wallet.id}
                    wallet={wallet}
                    investment={investmentReturns[wallet.id] ?? null}
                    onEdit={handleEditWallet}
                    onAdjust={handleAdjustWallet}
                    onDelete={handleDeleteWallet}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Categorías */}
        {activeSection === 'categorias' && (
          <section className="lumus-glass rounded-2xl p-6">
            <h2 className="lumus-heading mb-5 text-xl font-semibold text-[var(--text-primary)]">
              Categorías
            </h2>
            <CategoryList initialCategories={initialCategories} />
          </section>
        )}

        {/* Presupuestos */}
        {activeSection === 'presupuestos' && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
                  Presupuestos
                </h2>
                <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-1 py-0.5">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="lumus-label min-w-[110px] text-center text-[0.68rem] font-medium text-[var(--text-secondary)]">
                    {MONTHS[month - 1]} {year}
                  </span>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setEditingBudget(null); setShowBudgetForm(true) }}
                disabled={budgetsLoading}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                <Plus size={16} />
                Nuevo presupuesto
              </button>
            </div>

            {autoCopied && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--accent-lumus)]/20 bg-[var(--accent-muted)] px-4 py-2.5 text-xs text-[var(--accent-lumus)]">
                <span>✦</span>
                <span>Presupuestos copiados del mes anterior. Podés editarlos o eliminarlos para este mes.</span>
              </div>
            )}

            {budgetsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="lumus-glass h-40 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : budgets.length === 0 ? (
              <div className="lumus-glass rounded-2xl py-20 text-center">
                <p className="text-[var(--text-muted)]">No hay presupuestos para {MONTHS[month - 1].toLowerCase()} {year}.</p>
                <button
                  onClick={() => setShowBudgetForm(true)}
                  className="mt-4 text-sm text-[var(--accent-lumus)] hover:underline"
                >
                  Crear el primer presupuesto
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {budgets.map(budget => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onEdit={handleEditBudget}
                    onDelete={handleDeleteBudget}
                  />
                ))}
              </div>
            )}
          </section>
        )}
        {/* Metas de Ahorro */}
        {activeSection === 'metas' && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
                Metas de ahorro
              </h2>
              <button
                onClick={() => { setEditingGoal(null); setShowGoalForm(true) }}
                disabled={goalsLoading}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                <Plus size={16} />
                Nueva meta
              </button>
            </div>

            {goalsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="lumus-glass h-48 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : goals.length === 0 ? (
              <div className="lumus-glass rounded-2xl py-20 text-center">
                <p className="text-[var(--text-muted)]">No hay metas de ahorro todavía.</p>
                <button
                  onClick={() => setShowGoalForm(true)}
                  className="mt-4 text-sm text-[var(--accent-lumus)] hover:underline"
                >
                  Crear la primera meta
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {goals.map(goal => (
                  <SavingGoalCard
                    key={goal.id}
                    goal={goal}
                    wallets={wallets}
                    toARS={toARS}
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteGoal}
                    onContribute={async (id, amount, walletId) => { await contribute(id, amount, walletId) }}
                    onMarkAchieved={async (id) => { await markAchieved(id) }}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeSection === 'inversiones' && (
          <section className="space-y-8">
            {/* Las billeteras de inversión van arriba: son plata que ya está
                puesta y que se actualiza a mano, así que es lo primero que se
                viene a mirar acá. */}
            <InvestmentWalletsSection
              wallets={investmentWallets}
              events={investmentEvents}
              returns={investmentReturns}
              onAdjust={handleAdjustWallet}
            />

            <HoldingsSection
              initialHoldings={initialHoldings}
              prices={cryptoPrices}
              // Si la cotización todavía no cargó, la conversión a pesos espera:
              // mostrar un valor en ARS con un dólar inventado es peor que no
              // mostrarlo, y el valor en dólares se ve igual.
              arsPerUsd={exchangeRates?.USD ?? 0}
              rateHistory={rateHistory}
            />
          </section>
        )}
      </div>

      {showWalletForm && (
        <WalletForm
          onSave={handleSaveWallet}
          onClose={() => { setShowWalletForm(false); setEditingWallet(null) }}
          initial={editingWallet ?? undefined}
        />
      )}

      {adjustingWallet && (
        <WalletAdjustForm
          wallet={adjustingWallet}
          wallets={wallets}
          onAdjust={handleAdjustBalance}
          onClose={() => setAdjustingWallet(null)}
        />
      )}

      {showBudgetForm && (
        <BudgetForm
          categories={initialCategories}
          onSave={handleSaveBudget}
          onClose={() => { setShowBudgetForm(false); setEditingBudget(null) }}
          initial={editingBudget ?? undefined}
        />
      )}

      {showGoalForm && (
        <SavingGoalForm
          wallets={wallets}
          onSave={handleSaveGoal}
          onClose={() => { setShowGoalForm(false); setEditingGoal(null) }}
          initial={editingGoal ?? undefined}
        />
      )}

      {reportOpen && (
        <MonthlyReportModal
          report={report ?? null}
          generating={generating}
          error={reportError}
          monthLabel={prevMonthLabel}
          onGenerate={generate}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  )
}
