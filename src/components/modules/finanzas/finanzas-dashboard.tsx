'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, TrendingUp, TrendingDown, Layers, ChevronLeft, ChevronRight, BarChart2, Sparkles } from 'lucide-react'
import { LumusChat } from '@/components/lumus/lumus-chat'
import type { Wallet, FinanceCategory, Transaction, Budget, Subscription, SavingGoal } from '@/types/finance.types'
import { WalletCard } from './wallet-card'
import { WalletForm } from './wallet-form'
import { CategoryList } from './category-list'
import { TransactionList } from './transaction-list'
import { BudgetCard } from './budget-card'
import { BudgetForm } from './budget-form'
import { SubscriptionCard } from './subscription-card'
import { SubscriptionForm } from './subscription-form'
import { SavingGoalCard } from './saving-goal-card'
import { SavingGoalForm } from './saving-goal-form'
import { useWallets } from '@/hooks/use-wallets'
import { useBudgets } from '@/hooks/use-budgets'
import { useSubscriptions } from '@/hooks/use-subscriptions'
import { useSavingGoals } from '@/hooks/use-saving-goals'
import type { CreateWalletInput, UpdateWalletInput, CreateBudgetInput, CreateSubscriptionInput, CreateSavingGoalInput } from '@/lib/validations/finance'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface FinanzasDashboardProps {
  initialWallets: Wallet[]
  initialCategories: FinanceCategory[]
  initialTransactions: Transaction[]
  initialBudgets: Budget[]
  initialSubscriptions: Subscription[]
  initialGoals: SavingGoal[]
}

type Section = 'transacciones' | 'billeteras' | 'categorias' | 'presupuestos' | 'suscripciones' | 'metas'

export function FinanzasDashboard({
  initialWallets,
  initialCategories,
  initialTransactions,
  initialBudgets,
  initialSubscriptions,
  initialGoals,
}: FinanzasDashboardProps) {
  const { wallets, totalBalance, loading, createWallet, updateWallet, deleteWallet } =
    useWallets(initialWallets)
  const [showWalletForm, setShowWalletForm] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [activeSection, setActiveSection] = useState<Section>('transacciones')

  const now = new Date()
  const { budgets, month, year, loading: budgetsLoading, refresh: refreshBudgets, createBudget, updateBudget, deleteBudget } =
    useBudgets(initialBudgets, now.getMonth() + 1, now.getFullYear())
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  const { subscriptions, loading: subsLoading, monthlyTotal, createSubscription, updateSubscription, deleteSubscription, toggleActive } =
    useSubscriptions(initialSubscriptions)
  const [showSubForm, setShowSubForm] = useState(false)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)

  const { goals, loading: goalsLoading, createGoal, updateGoal, deleteGoal, contribute, markAchieved } =
    useSavingGoals(initialGoals)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null)

  const [chatOpen, setChatOpen] = useState(false)

  const CHAT_SUGGESTIONS = [
    '¿En qué gasto de más?',
    '¿Puedo ahorrar más?',
    'Analizá mis gastos del mes',
    '¿Cómo estoy financieramente?',
  ]

  const gastosDelMes = initialTransactions
    .filter(t => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0)
  const ingresosDelMes = initialTransactions
    .filter(t => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0)

  const fmt = (n: number, currency = 'ARS') =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)

  async function handleSaveWallet(data: CreateWalletInput) {
    if (editingWallet) {
      const { balance: _b, ...updateData } = data
      await updateWallet(editingWallet.id, updateData as UpdateWalletInput)
    } else {
      await createWallet(data)
    }
    setShowWalletForm(false)
    setEditingWallet(null)
  }

  async function handleDeleteWallet(id: string) {
    if (!confirm('¿Eliminar esta billetera? Las transacciones asociadas quedarán sin billetera.')) return
    await deleteWallet(id)
  }

  function handleEditWallet(wallet: Wallet) {
    setEditingWallet(wallet)
    setShowWalletForm(true)
  }

  async function handleSaveBudget(data: CreateBudgetInput) {
    if (editingBudget) {
      await updateBudget(editingBudget.id, { amount: data.amount })
    } else {
      await createBudget(data)
    }
    setShowBudgetForm(false)
    setEditingBudget(null)
  }

  function handleEditBudget(budget: Budget) {
    setEditingBudget(budget)
    setShowBudgetForm(true)
  }

  async function handleDeleteBudget(id: string) {
    if (!confirm('¿Eliminar este presupuesto?')) return
    await deleteBudget(id)
  }

  function navigateMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    refreshBudgets(m, y)
  }

  async function handleSaveSub(data: CreateSubscriptionInput) {
    if (editingSub) {
      await updateSubscription(editingSub.id, data)
    } else {
      await createSubscription(data)
    }
    setShowSubForm(false)
    setEditingSub(null)
  }

  function handleEditSub(s: Subscription) {
    setEditingSub(s)
    setShowSubForm(true)
  }

  async function handleDeleteSub(id: string) {
    if (!confirm('¿Eliminar esta suscripción?')) return
    await deleteSubscription(id)
  }

  async function handleSaveGoal(data: CreateSavingGoalInput) {
    if (editingGoal) {
      await updateGoal(editingGoal.id, data)
    } else {
      await createGoal(data)
    }
    setShowGoalForm(false)
    setEditingGoal(null)
  }

  function handleEditGoal(g: SavingGoal) {
    setEditingGoal(g)
    setShowGoalForm(true)
  }

  async function handleDeleteGoal(id: string) {
    if (!confirm('¿Eliminar esta meta de ahorro?')) return
    await deleteGoal(id)
  }

  const SECTIONS: { id: Section; label: string }[] = [
    { id: 'transacciones', label: 'Movimientos' },
    { id: 'billeteras',    label: 'Billeteras' },
    { id: 'categorias',    label: 'Categorías' },
    { id: 'presupuestos',  label: 'Presupuestos' },
    { id: 'suscripciones', label: 'Suscripciones' },
    { id: 'metas',         label: 'Metas' },
  ]

  return (
    <div className="min-h-screen px-5 py-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[1120px]">

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="lumus-heading text-4xl font-bold text-[var(--text-primary)] md:text-5xl">
                Finanzas
              </h1>
              <p className="mt-3 text-base text-[var(--text-secondary)]">
                Controlá tus billeteras, gastos e ingresos.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <p className="lumus-label text-[0.62rem] text-[var(--text-muted)]">BALANCE TOTAL</p>
                <p className={`lumus-heading mt-1 text-3xl font-bold ${
                  totalBalance >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                }`}>
                  {fmt(totalBalance)}
                </p>
              </div>
              <Link
                href="/finanzas/reportes"
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-white/20 hover:text-[var(--text-secondary)]"
              >
                <BarChart2 size={12} />
                Ver reportes
              </Link>
            </div>
          </div>

          {/* Stats del mes */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="lumus-glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-[var(--accent-lumus)]">
                <Layers size={16} />
                <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">BILLETERAS</p>
              </div>
              <p className="lumus-heading mt-2 text-2xl font-bold text-[var(--accent-lumus)]">
                {wallets.length}
              </p>
            </div>
            <div className="lumus-glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-[var(--success)]">
                <TrendingUp size={16} />
                <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">INGRESOS</p>
              </div>
              <p className="lumus-heading mt-2 text-2xl font-bold text-[var(--success)]">
                {fmt(ingresosDelMes)}
              </p>
            </div>
            <div className="lumus-glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-[var(--danger)]">
                <TrendingDown size={16} />
                <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">GASTOS</p>
              </div>
              <p className="lumus-heading mt-2 text-2xl font-bold text-[var(--danger)]">
                {fmt(gastosDelMes)}
              </p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 w-fit">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
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
          <section className="lumus-glass rounded-2xl p-6">
            <h2 className="lumus-heading mb-5 text-xl font-semibold text-[var(--text-primary)]">
              Movimientos del mes
            </h2>
            <TransactionList
              initialTransactions={initialTransactions}
              wallets={wallets}
              categories={initialCategories}
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
                    onEdit={handleEditWallet}
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
        {/* Suscripciones */}
        {activeSection === 'suscripciones' && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="lumus-heading text-xl font-semibold text-[var(--text-primary)]">
                  Suscripciones
                </h2>
                {subscriptions.some(s => s.active) && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Total mensual activo:{' '}
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {fmt(monthlyTotal)}
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={() => { setEditingSub(null); setShowSubForm(true) }}
                disabled={subsLoading}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                <Plus size={16} />
                Nueva suscripción
              </button>
            </div>

            {subsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="lumus-glass h-40 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="lumus-glass rounded-2xl py-20 text-center">
                <p className="text-[var(--text-muted)]">No tenés suscripciones registradas.</p>
                <button
                  onClick={() => setShowSubForm(true)}
                  className="mt-4 text-sm text-[var(--accent-lumus)] hover:underline"
                >
                  Agregar la primera
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subscriptions.map(sub => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onEdit={handleEditSub}
                    onDelete={handleDeleteSub}
                    onToggleActive={toggleActive}
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
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteGoal}
                    onContribute={async (id, amount) => { await contribute(id, amount) }}
                    onMarkAchieved={async (id) => { await markAchieved(id) }}
                  />
                ))}
              </div>
            )}
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

      {showBudgetForm && (
        <BudgetForm
          categories={initialCategories}
          onSave={handleSaveBudget}
          onClose={() => { setShowBudgetForm(false); setEditingBudget(null) }}
          initial={editingBudget ?? undefined}
        />
      )}

      {showSubForm && (
        <SubscriptionForm
          wallets={wallets}
          onSave={handleSaveSub}
          onClose={() => { setShowSubForm(false); setEditingSub(null) }}
          initial={editingSub ?? undefined}
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

      {/* Botón flotante — Lumus */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2.5 rounded-full bg-[var(--accent-lumus)] py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-xl hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Sparkles size={15} />
          <span className="hidden sm:inline">Lumus</span>
        </button>
      )}

      {/* Chat panel */}
      {chatOpen && (
        <LumusChat
          module="finanzas"
          moduleLabel="Finanzas"
          suggestions={CHAT_SUGGESTIONS}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}
