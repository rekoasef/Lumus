'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Banknote, Check, DollarSign, Landmark, Loader2, Smartphone, type LucideIcon } from 'lucide-react'
import { useOnboarding } from '@/hooks/use-onboarding'
import { WALLET_PRESETS, parseAmountInput, type WalletPreset, type WalletPresetId } from '@/lib/onboarding/wallet-presets'
import { CategoryIcon } from '@/lib/utils/category-icons'
import type { FinanceCategory } from '@/types/finance.types'

const LABELS = {
  step: (n: number) => `Paso ${n} de 3`,
  later: 'Lo hago después',
  name: {
    eyebrow: 'Te damos la bienvenida',
    title: '¿Cómo te llamamos?',
    body: 'En tres pasos cargás tu primer gasto. Lo demás lo vas armando con el uso.',
    placeholder: 'Tu nombre',
    cta: 'Seguir',
  },
  wallet: {
    title: '¿Dónde tenés tu plata?',
    body: 'Empezá con una. Después sumás las que quieras.',
    nameLabel: 'Nombre',
    balanceLabel: '¿Cuánto hay hoy?',
    balanceHint: 'Si no sabés exacto, poné un aproximado. Lo corregís cuando quieras.',
    cta: 'Crear billetera',
    invalidAmount: 'Revisá el monto: solo números, con punto de miles o coma decimal.',
  },
  expense: {
    title: 'Cargá tu primer gasto',
    body: 'Lo último que pagaste: un café, el colectivo, el súper.',
    amountLabel: 'Monto',
    categoryLabel: 'Categoría',
    descriptionLabel: 'Qué fue (opcional)',
    descriptionPlaceholder: 'Ej: café de la mañana',
    cta: 'Guardar y entrar',
    invalidAmount: 'Escribí cuánto gastaste.',
  },
} as const

const PRESET_ICONS: Record<WalletPresetId, LucideIcon> = {
  efectivo: Banknote,
  banco: Landmark,
  mercadopago: Smartphone,
  dolares: DollarSign,
}

type Step = 1 | 2 | 3

/** A dónde va al terminar o saltear. Navegación completa: el router cacheó que el panel mandaba acá. */
function goToDashboard() {
  window.location.assign('/dashboard')
}

export function OnboardingFlow() {
  const reduceMotion = useReducedMotion()
  const { busy, error, clearError, saveName, createWallet, createExpense } = useOnboarding()
  const [step, setStep] = useState<Step>(1)
  const [localError, setLocalError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [preset, setPreset] = useState<WalletPreset | null>(null)
  const [walletName, setWalletName] = useState('')
  const [balance, setBalance] = useState('')
  const [walletId, setWalletId] = useState<string | null>(null)
  const [walletCurrency, setWalletCurrency] = useState('ARS')
  const [categories, setCategories] = useState<FinanceCategory[]>([])
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [description, setDescription] = useState('')

  const shownError = localError ?? error

  function choosePreset(p: WalletPreset) {
    setPreset(p)
    setWalletName(p.name)
    setLocalError(null)
    clearError()
  }

  async function submitName(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    if (await saveName(name)) setStep(2)
  }

  async function submitWallet(e: React.FormEvent) {
    e.preventDefault()
    if (!preset || busy) return
    const parsed = balance.trim() ? parseAmountInput(balance) : 0
    if (parsed === null) {
      setLocalError(LABELS.wallet.invalidAmount)
      return
    }
    setLocalError(null)
    const created = await createWallet(preset, walletName, parsed)
    if (!created) return
    setWalletId(created.wallet.id)
    setWalletCurrency(created.wallet.currency)
    setCategories(created.categories)
    setStep(3)
  }

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!walletId || busy) return
    const parsed = parseAmountInput(amount)
    if (!parsed) {
      setLocalError(LABELS.expense.invalidAmount)
      return
    }
    setLocalError(null)
    if (await createExpense(walletId, parsed, categoryId, description)) goToDashboard()
  }

  const inputClass =
    'w-full rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/25'
  const labelClass = 'mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]'
  const primaryClass =
    'flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-lumus)] py-3.5 text-sm font-bold text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50'
  const laterClass = 'mt-3 w-full py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]'

  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 } }

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-8 pb-10 sm:justify-center sm:pt-12">
      {/* Progreso */}
      <div className="mb-10 flex items-center gap-3">
        <span className="relative grid size-9 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
          <Image src="/logoLumus.png" alt="" width={72} height={72} className="h-full w-full scale-[2.7] object-cover opacity-90 mix-blend-screen" priority />
        </span>
        <div className="flex-1">
          <p className="lumus-label mb-2 text-[0.6rem] text-[var(--text-muted)]">{LABELS.step(step)}</p>
          <div className="grid grid-cols-3 gap-1.5" aria-hidden>
            {[1, 2, 3].map(n => (
              <span key={n} className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.span
                  className="block h-full rounded-full bg-[var(--accent-lumus)]"
                  initial={false}
                  animate={{ width: n <= step ? '100%' : '0%' }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                />
              </span>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === 1 && (
          <motion.form key="name" {...slide} transition={{ duration: 0.22 }} onSubmit={submitName}>
            <p className="lumus-label text-[0.65rem] text-[var(--accent-lumus)]">{LABELS.name.eyebrow}</p>
            <h1 className="lumus-heading mt-3 text-3xl font-bold text-[var(--text-primary)]">{LABELS.name.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{LABELS.name.body}</p>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={LABELS.name.placeholder}
              autoComplete="given-name"
              maxLength={100}
              className={`${inputClass} mt-8 text-lg`}
            />
            <ErrorLine message={shownError} />
            <button type="submit" disabled={!name.trim() || busy} className={`${primaryClass} mt-6`}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              {LABELS.name.cta}
            </button>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form key="wallet" {...slide} transition={{ duration: 0.22 }} onSubmit={submitWallet}>
            <h1 className="lumus-heading text-3xl font-bold text-[var(--text-primary)]">{LABELS.wallet.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{LABELS.wallet.body}</p>

            <div className="mt-7 grid grid-cols-2 gap-3" role="radiogroup">
              {WALLET_PRESETS.map(p => {
                const Icon = PRESET_ICONS[p.id]
                const selected = preset?.id === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => choosePreset(p)}
                    className={`relative flex min-h-[112px] flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                      selected ? 'bg-white/[0.06]' : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                    style={selected ? { borderColor: p.color, boxShadow: `0 0 0 1px ${p.color}` } : undefined}
                  >
                    <span className="grid size-9 place-items-center rounded-xl" style={{ backgroundColor: `${p.color}22`, color: p.color }}>
                      <Icon size={18} />
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{p.label}</span>
                    <span className="text-xs leading-snug text-[var(--text-muted)]">{p.hint}</span>
                    {selected && (
                      <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full text-[#0b0b12]" style={{ backgroundColor: p.color }}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <AnimatePresence initial={false}>
              {preset && (
                <motion.div
                  key="wallet-details"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-6">
                    <div>
                      <label htmlFor="wallet-name" className={labelClass}>{LABELS.wallet.nameLabel}</label>
                      <input id="wallet-name" value={walletName} onChange={e => setWalletName(e.target.value)} maxLength={100} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="wallet-balance" className={labelClass}>{LABELS.wallet.balanceLabel}</label>
                      <AmountInput id="wallet-balance" currency={preset.currency} value={balance} onChange={setBalance} inputClass={inputClass} placeholder="0" />
                      <p className="mt-2 text-xs text-[var(--text-muted)]">{LABELS.wallet.balanceHint}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <ErrorLine message={shownError} />
            <button type="submit" disabled={!preset || busy} className={`${primaryClass} mt-6`}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              {LABELS.wallet.cta}
            </button>
            <button type="button" onClick={goToDashboard} className={laterClass}>{LABELS.later}</button>
          </motion.form>
        )}

        {step === 3 && (
          <motion.form key="expense" {...slide} transition={{ duration: 0.22 }} onSubmit={submitExpense}>
            <h1 className="lumus-heading text-3xl font-bold text-[var(--text-primary)]">{LABELS.expense.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{LABELS.expense.body}</p>

            <div className="mt-7">
              <label htmlFor="expense-amount" className={labelClass}>{LABELS.expense.amountLabel}</label>
              <AmountInput id="expense-amount" currency={walletCurrency} value={amount} onChange={setAmount} inputClass={`${inputClass} text-2xl font-semibold`} placeholder="0" autoFocus />
            </div>

            {categories.length > 0 && (
              <div className="mt-6">
                <p className={labelClass}>{LABELS.expense.categoryLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => {
                    const selected = categoryId === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setCategoryId(selected ? null : c.id)}
                        className={`flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors ${
                          selected ? 'text-[var(--text-primary)]' : 'border-white/[0.08] text-[var(--text-secondary)] hover:bg-white/[0.04]'
                        }`}
                        style={selected ? { borderColor: c.color, backgroundColor: `${c.color}22` } : undefined}
                      >
                        {c.icon && <CategoryIcon icon={c.icon} size={14} style={{ color: c.color }} />}
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-6">
              <label htmlFor="expense-description" className={labelClass}>{LABELS.expense.descriptionLabel}</label>
              <input
                id="expense-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={LABELS.expense.descriptionPlaceholder}
                maxLength={500}
                className={inputClass}
              />
            </div>

            <ErrorLine message={shownError} />
            <button type="submit" disabled={!amount.trim() || busy} className={`${primaryClass} mt-6`}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              {LABELS.expense.cta}
            </button>
            <button type="button" onClick={goToDashboard} className={laterClass}>{LABELS.later}</button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

function AmountInput({ id, currency, value, onChange, inputClass, placeholder, autoFocus }: {
  id: string
  currency: string
  value: string
  onChange: (value: string) => void
  inputClass: string
  placeholder: string
  autoFocus?: boolean
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-medium text-[var(--text-muted)]">
        {currency === 'USD' ? 'US$' : '$'}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} ${currency === 'USD' ? 'pl-14' : 'pl-9'}`}
      />
    </div>
  )
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-2.5 text-sm text-[var(--danger)]">
      {message}
    </p>
  )
}
