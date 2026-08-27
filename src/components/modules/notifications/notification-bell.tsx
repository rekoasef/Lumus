'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Check, Loader2 } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { timeAgo } from '@/lib/utils/format-date'
import { isNotificationType } from '@/lib/notifications/preferences'
import type { Notification, NotificationType } from '@/types/notifications.types'

const LABELS = {
  trigger: 'Avisos',
  title: 'Avisos',
  markAll: 'Marcar todo como leído',
  empty: 'No hay avisos todavía.',
  emptyHint: 'Acá van a aparecer los vencimientos, los presupuestos y las metas.',
  settings: 'Preferencias',
} as const

/** Un punto de color por tipo — el mismo lenguaje que los sellos del mail. */
const DOT: Record<NotificationType, string> = {
  vencimiento:          'var(--warning)',
  presupuesto_alerta:   'var(--warning)',
  presupuesto_excedido: 'var(--danger)',
  meta_alcanzada:       'var(--success)',
  reporte_mensual:      'var(--accent-lumus)',
  resumen_semanal:      'var(--accent-lumus)',
}

function dotColor(notification: Notification): string {
  return isNotificationType(notification.type) ? DOT[notification.type] : 'var(--text-muted)'
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { notifications, unread, loading, loaded, load, markRead, markAllRead } =
    useNotifications(initialUnread)

  useEffect(() => {
    if (open && !loaded) load()
  }, [open, loaded, load])

  // Cerrar con Escape o al hacer clic afuera, como el resto de los diálogos.
  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false)
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  async function handleClick(notification: Notification) {
    if (!notification.read_at) await markRead(notification.id)
    if (notification.link) {
      setOpen(false)
      router.push(notification.link)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        title={LABELS.trigger}
        aria-label={LABELS.trigger}
        className={`relative flex items-center rounded-lg px-2.5 py-2 text-[var(--text-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text-secondary)] ${
          open ? 'bg-white/[0.08] text-[var(--text-primary)]' : ''
        }`}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-bold text-white"
            style={{ background: '#7c6dfa', boxShadow: '0 0 8px rgba(124,109,250,0.6)' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#15141d] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{LABELS.title}</p>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[0.7rem] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  <Check size={12} />
                  {LABELS.markAll}
                </button>
              )}
            </div>

            <div className="max-h-[24rem] overflow-y-auto">
              {loading && !loaded ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">{LABELS.empty}</p>
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">{LABELS.emptyHint}</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => handleClick(notification)}
                    className={`flex w-full gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/[0.03] ${
                      notification.read_at ? 'opacity-60' : ''
                    }`}
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: dotColor(notification) }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
                        {notification.title}
                      </span>
                      {notification.body && (
                        <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-secondary)]">
                          {notification.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[0.68rem] text-[var(--text-muted)]">
                        {timeAgo(notification.created_at)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-white/[0.06] px-4 py-2.5">
              <button
                onClick={() => { setOpen(false); router.push('/perfil#avisos') }}
                className="text-[0.7rem] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                {LABELS.settings}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
