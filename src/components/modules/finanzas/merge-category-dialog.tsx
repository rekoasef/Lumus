'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, ArrowRight, Loader2, AlertTriangle } from 'lucide-react'
import { CategoryIcon } from '@/lib/utils/category-icons'
import type { FinanceCategory, MergeCategoriesPreview } from '@/types'

const LABELS = {
  title: 'Unificar categoría',
  subtitle: 'Todo lo que esté en esta categoría se va a mover a la que elijas.',
  targetLabel: 'MOVER TODO A',
  empty: 'No hay otra categoría del mismo tipo para unificar.',
  irreversible: 'Esta acción no se puede deshacer.',
  confirm: 'Unificar',
  merging: 'Unificando...',
  cancel: 'Cancelar',
  close: 'Cerrar',
  counting: 'Contando...',
  nothing: 'Esta categoría no tiene nada cargado todavía.',
} as const

interface MergeCategoryDialogProps {
  source: FinanceCategory
  candidates: FinanceCategory[]
  merging: boolean
  onMerge: (targetId: string) => void
  onClose: () => void
}

/** "3 transacciones", "1 transacción" — sin plurales rotos en la UI. */
function plural(n: number, singular: string, plural_: string) {
  return `${n} ${n === 1 ? singular : plural_}`
}

export function MergeCategoryDialog({
  source, candidates, merging, onMerge, onClose,
}: MergeCategoryDialogProps) {
  const [targetId, setTargetId] = useState<string | null>(null)
  const [preview, setPreview] = useState<MergeCategoriesPreview | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/finance/categories/${source.id}/merge`)
      .then(r => r.json() as Promise<{ preview: MergeCategoriesPreview }>)
      .then(d => { if (!cancelled) setPreview(d.preview) })
      .catch(() => { if (!cancelled) setPreview(null) })
    return () => { cancelled = true }
  }, [source.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !merging) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, merging])

  const total = preview ? preview.transactions + preview.recurring + preview.budgets : 0
  const parts = preview
    ? [
        preview.transactions > 0 && plural(preview.transactions, 'transacción', 'transacciones'),
        preview.recurring > 0 && plural(preview.recurring, 'vencimiento', 'vencimientos'),
        preview.budgets > 0 && plural(preview.budgets, 'presupuesto', 'presupuestos'),
      ].filter(Boolean) as string[]
    : []

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={() => !merging && onClose()}
      />
      <motion.div
        className="fixed inset-x-4 bottom-4 z-[201] mx-auto max-w-md sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <div
          className="rounded-2xl p-5"
          style={{
            background: '#13121c',
            border: '1px solid rgba(124,109,250,0.2)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">{LABELS.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/45">{LABELS.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              disabled={merging}
              aria-label={LABELS.close}
              className="flex-shrink-0 rounded-lg p-1 text-white/30 transition-colors hover:text-white/60 disabled:opacity-40"
            >
              <X size={14} />
            </button>
          </div>

          {/* Origen → destino */}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${source.color}22` }}
              >
                <CategoryIcon icon={source.icon} size={14} style={{ color: source.color }} />
              </div>
              <span className="truncate text-sm text-white">{source.name}</span>
            </div>
            <ArrowRight size={14} className="shrink-0 text-white/30" />
            <div className="min-w-0 flex-1 text-right text-sm text-white/40">
              {targetId
                ? candidates.find(c => c.id === targetId)?.name
                : '…'}
            </div>
          </div>

          {/* Qué se va a mover */}
          <p className="mt-3 text-xs leading-relaxed text-white/45">
            {preview === null
              ? LABELS.counting
              : total === 0
                ? LABELS.nothing
                : `Se van a mover ${parts.join(', ')}.`}
          </p>

          {/* Destino */}
          {candidates.length === 0 ? (
            <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs text-white/45">
              {LABELS.empty}
            </p>
          ) : (
            <>
              <p className="lumus-label mt-4 mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">
                {LABELS.targetLabel}
              </p>
              <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {candidates.map(c => {
                  const active = targetId === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setTargetId(c.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${
                        active
                          ? 'border-[var(--accent-lumus)]/40 bg-[var(--accent-muted)]'
                          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'
                      }`}
                    >
                      <div
                        className="flex size-6 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${c.color}22` }}
                      >
                        <CategoryIcon icon={c.icon} size={12} style={{ color: c.color }} />
                      </div>
                      <span className={`truncate text-sm ${active ? 'text-white' : 'text-white/60'}`}>
                        {c.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {targetId && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.07] p-2.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-orange-400" />
              <p className="text-xs leading-relaxed text-white/60">{LABELS.irreversible}</p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={onClose}
              disabled={merging}
              className="flex-1 rounded-xl border border-white/[0.07] py-2 text-xs font-medium text-white/50 transition-colors hover:text-white/80 disabled:opacity-40"
            >
              {LABELS.cancel}
            </button>
            <button
              onClick={() => targetId && onMerge(targetId)}
              disabled={!targetId || merging}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent-lumus)] py-2 text-xs font-medium text-white transition-opacity hover:bg-[var(--accent-hover)] disabled:opacity-40"
            >
              {merging && <Loader2 size={13} className="animate-spin" />}
              {merging ? LABELS.merging : LABELS.confirm}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
