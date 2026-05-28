'use client'

import { useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Trash2, LogOut, X } from 'lucide-react'

export type ConfirmVariant = 'danger' | 'warning' | 'default'

interface ConfirmOptions {
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
  icon: React.ReactNode
  confirmClass: string
  borderColor: string
  iconBg: string
}> = {
  danger: {
    icon: <Trash2 size={18} />,
    confirmClass: 'bg-red-500/90 hover:bg-red-500 text-white',
    borderColor: 'rgba(239,68,68,0.2)',
    iconBg: 'rgba(239,68,68,0.12)',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    confirmClass: 'bg-orange-500/90 hover:bg-orange-500 text-white',
    borderColor: 'rgba(249,115,22,0.2)',
    iconBg: 'rgba(249,115,22,0.12)',
  },
  default: {
    icon: <LogOut size={18} />,
    confirmClass: 'bg-[var(--accent-lumus)] hover:bg-[var(--accent-hover)] text-white',
    borderColor: 'rgba(124,109,250,0.2)',
    iconBg: 'rgba(124,109,250,0.12)',
  },
}

let _setConfirm: ((state: ConfirmState | null) => void) | null = null

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    _setConfirm?.({ ...options, resolve })
  })
}

export function ConfirmDialogProvider() {
  const [state, setConfirm] = useState<ConfirmState | null>(null)
  const resolveRef = useRef<((v: boolean) => void) | null>(null)

  _setConfirm = useCallback((s: ConfirmState | null) => {
    if (s) resolveRef.current = s.resolve
    setConfirm(s)
  }, [])

  function handleAnswer(value: boolean) {
    resolveRef.current?.(value)
    resolveRef.current = null
    setConfirm(null)
  }

  const variant = state?.variant ?? 'danger'
  const config = VARIANT_CONFIG[variant]

  return (
    <AnimatePresence>
      {state && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => handleAnswer(false)}
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            className="fixed inset-x-4 bottom-4 z-[201] mx-auto max-w-sm sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div
              className="rounded-2xl p-5 sm:rounded-2xl"
              style={{
                background: '#13121c',
                border: `1px solid ${config.borderColor}`,
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-9 items-center justify-center rounded-xl flex-shrink-0"
                    style={{ background: config.iconBg, color: variant === 'danger' ? '#f87171' : variant === 'warning' ? '#fb923c' : '#a78bfa' }}
                  >
                    {config.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {state.title ?? (variant === 'danger' ? 'Eliminar' : 'Confirmar')}
                  </h3>
                </div>
                <button
                  onClick={() => handleAnswer(false)}
                  className="flex-shrink-0 rounded-lg p-1 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Description */}
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                {state.description}
              </p>

              {/* Actions */}
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => handleAnswer(false)}
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80"
                >
                  {state.cancelLabel ?? 'Cancelar'}
                </button>
                <button
                  onClick={() => handleAnswer(true)}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${config.confirmClass}`}
                >
                  {state.confirmLabel ?? (variant === 'danger' ? 'Eliminar' : 'Confirmar')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
