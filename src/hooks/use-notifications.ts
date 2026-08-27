'use client'

import { useCallback, useState } from 'react'
import type { Notification, NotificationFeed } from '@/types/notifications.types'

/**
 * El feed del centro de notificaciones.
 *
 * El contador inicial viene del server component del layout, así que la
 * campanita ya se dibuja con el número correcto: la lista se pide recién al
 * abrir el panel, que es cuando hace falta.
 */
export function useNotifications(initialUnread: number) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  // El contador del server es el valor de arranque y nada más: a partir de ahí
  // lo maneja el hook. Abrir el panel lo trae fresco, y marcar como leído lo
  // baja al toque. Los avisos llegan una vez por día, así que no hace falta
  // que la campanita se entere sola de algo que pasó mientras mirabas.
  const [unread, setUnread] = useState(initialUnread)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json() as NotificationFeed
      setNotifications(data.notifications)
      setUnread(data.unread)
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [])

  /** Marca en pantalla primero y después avisa al servidor: el panel no
   *  puede quedarse esperando a la red para tachar un aviso. */
  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id && !n.read_at
      ? { ...n, read_at: new Date().toISOString() }
      : n)))
    setUnread(prev => Math.max(0, prev - 1))

    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => null)
  }, [])

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString()
    setNotifications(prev => prev.map(n => (n.read_at ? n : { ...n, read_at: now })))
    setUnread(0)

    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => null)
  }, [])

  return { notifications, unread, loading, loaded, load, markRead, markAllRead }
}
