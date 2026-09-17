'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, ChevronRight, X } from 'lucide-react'
import { openQuickExpense } from '@/components/shared/quick-expense'
import { HABIT_DAYS, type FirstStep, type FirstStepId } from '@/lib/onboarding/first-steps'

const LABELS = {
  title: 'Primeros pasos',
  progress: (done: number, total: number) => `${done} de ${total}`,
  hide: 'Ocultar primeros pasos',
  steps: {
    wallet: { title: 'Creá tu billetera', body: 'Dónde tenés la plata: efectivo, banco, Mercado Pago.' },
    first_expense: { title: 'Cargá tu primer gasto', body: 'Con el + de abajo, en cinco segundos.' },
    habit: { title: `Cargá gastos ${HABIT_DAYS} días distintos`, body: 'Un minuto por día alcanza para saber a dónde se va la plata.' },
    budget: { title: 'Poné un presupuesto', body: 'Un límite por categoría, y Lumus te avisa antes de pasarte.' },
    install: { title: 'Instalá Lumus en el celular', body: 'Se abre como una app y cargar un gasto es más rápido.' },
  },
  installIos: 'En Safari: tocá Compartir y después "Agregar a inicio".',
  installOther: 'En el menú del navegador (⋮), elegí "Instalar app" o "Agregar a la pantalla de inicio".',
} as const

const DISMISS_KEY = 'lumus:first-steps-dismissed'

type StepId = FirstStepId | 'install'

/** Lo que Chrome en Android entrega para instalar la app con un botón propio. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

type Platform = 'installed' | 'desktop' | 'ios' | 'android-prompt' | 'other'

function detectPlatform(): Platform {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) return 'installed'
  if (!window.matchMedia('(pointer: coarse)').matches) return 'desktop'
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return 'ios'
  return 'other'
}

/** Ocultarla se avisa con un evento propio para que el store se entere. */
const DISMISS_EVENT = 'lumus:first-steps-dismiss'

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    // Sin almacenamiento (modo privado): se muestra.
    return false
  }
}

function subscribeDismissed(onChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(DISMISS_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

const noopSubscribe = () => () => {}

export function FirstStepsCard({ steps }: { steps: readonly FirstStep[] }) {
  // En el servidor no se sabe si la ocultó ni en qué dispositivo está: ahí no
  // se dibuja nada, mejor que mostrarla y hacerla desaparecer.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const storedDismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => false)
  const detected = useSyncExternalStore(noopSubscribe, detectPlatform, () => 'desktop' as Platform)
  const [dismissedNow, setDismissedNow] = useState(false)
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)
  const [showInstallHelp, setShowInstallHelp] = useState(false)

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault()
      setInstallEvent(e as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const dismissed = storedDismissed || dismissedNow
  const platform: Platform = installEvent && detected !== 'installed' ? 'android-prompt' : detected

  function dismiss() {
    setDismissedNow(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
      window.dispatchEvent(new Event(DISMISS_EVENT))
    } catch {
      // Sin almacenamiento: ocultarla dura la visita.
    }
  }

  async function install() {
    if (installEvent) {
      await installEvent.prompt()
      setInstallEvent(null)
      return
    }
    setShowInstallHelp(v => !v)
  }

  if (!mounted || dismissed) return null

  // En la computadora instalar no suma: el paso ni aparece.
  const withInstall: { id: StepId; done: boolean; progress?: number }[] =
    platform === 'desktop' ? [...steps] : [...steps, { id: 'install', done: platform === 'installed' }]

  const doneCount = withInstall.filter(s => s.done).length
  if (doneCount === withInstall.length) return null

  // El primer paso que falta es el único con acción destacada.
  const nextId = withInstall.find(s => !s.done)?.id

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
      className="lumus-glass mx-auto max-w-[1120px] rounded-2xl p-4 sm:p-5"
      aria-label={LABELS.title}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="lumus-heading text-base font-semibold text-[var(--text-primary)]">{LABELS.title}</h2>
          <span className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-xs font-medium text-[var(--accent-lumus)]">
            {LABELS.progress(doneCount, withInstall.length)}
          </span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={LABELS.hide}
          className="grid size-10 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-secondary)] can-hover:size-8"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-[var(--accent-lumus)]"
          initial={false}
          animate={{ width: `${(doneCount / withInstall.length) * 100}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
        />
      </div>

      <ol className="mt-2 divide-y divide-white/[0.05]">
        {withInstall.map(step => {
          const copy = LABELS.steps[step.id]
          const isNext = step.id === nextId
          const body = step.id === 'habit' && !step.done && step.progress !== undefined
            ? `${copy.body} Llevás ${step.progress} de ${HABIT_DAYS}.`
            : copy.body

          const content = (
            <>
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                  step.done ? 'border-transparent bg-[var(--accent-lumus)] text-[#190f5d]' : isNext ? 'border-[var(--accent-lumus)]' : 'border-white/15'
                }`}
              >
                {step.done && <Check size={13} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${step.done ? 'text-[var(--text-muted)] line-through decoration-white/20' : 'font-medium text-[var(--text-primary)]'}`}>
                  {copy.title}
                </span>
                {!step.done && <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-muted)]">{body}</span>}
              </span>
              {!step.done && <ChevronRight size={16} className={`shrink-0 ${isNext ? 'text-[var(--accent-lumus)]' : 'text-[var(--text-muted)]'}`} />}
            </>
          )

          const rowClass = 'flex w-full min-h-14 items-center gap-3 py-3 text-left'

          return (
            <li key={step.id}>
              {step.done ? (
                <div className={rowClass}>{content}</div>
              ) : step.id === 'wallet' ? (
                <Link href="/finanzas/billeteras" className={rowClass}>{content}</Link>
              ) : step.id === 'budget' ? (
                <Link href="/finanzas/presupuestos" className={rowClass}>{content}</Link>
              ) : step.id === 'install' ? (
                <>
                  <button type="button" onClick={install} className={rowClass}>{content}</button>
                  {showInstallHelp && (
                    <p className="-mt-1 mb-3 ml-9 rounded-lg bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                      {platform === 'ios' ? LABELS.installIos : LABELS.installOther}
                    </p>
                  )}
                </>
              ) : (
                <button type="button" onClick={() => openQuickExpense()} className={rowClass}>{content}</button>
              )}
            </li>
          )
        })}
      </ol>
    </motion.section>
  )
}
