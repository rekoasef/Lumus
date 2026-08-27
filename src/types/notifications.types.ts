import type { Database } from './database.types'

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']

/**
 * Tipos de aviso que entiende el motor.
 *
 * Sumar uno acá implica también el `check` de la migración: están atados a
 * propósito, así un tipo que la base no conoce se rechaza en el insert en vez
 * de mandarse mal.
 */
export const NOTIFICATION_TYPES = [
  'vencimiento',
  'presupuesto_alerta',
  'presupuesto_excedido',
  'meta_alcanzada',
  'reporte_mensual',
  'resumen_semanal',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface NotificationChannels {
  /** Aparece en el centro de notificaciones. */
  inApp: boolean
  /** Entra en el digest diario por mail. */
  email: boolean
}

export interface NotificationTypeInfo {
  label: string
  description: string
  /**
   * Qué pasa si el usuario nunca tocó nada. Vive acá y no como default de una
   * columna porque es una decisión de producto, y cambia más seguido que un
   * schema.
   */
  default: NotificationChannels
  /**
   * Los avisos transaccionales no se apagan: si no llegan, el usuario pierde
   * algo sin enterarse de por qué. Hoy ninguno lo es — los de facturación
   * llegan con `C8`.
   */
  canDisable: boolean
}

export const NOTIFICATION_TYPE_INFO: Record<NotificationType, NotificationTypeInfo> = {
  vencimiento: {
    label: 'Vencimientos',
    description: 'Cuando un pago fijo está por vencer o ya venció.',
    default: { inApp: true, email: true },
    canDisable: true,
  },
  presupuesto_alerta: {
    label: 'Presupuesto al 80%',
    description: 'Cuando gastaste el 80% de lo que te pusiste como límite.',
    default: { inApp: true, email: true },
    canDisable: true,
  },
  presupuesto_excedido: {
    label: 'Presupuesto excedido',
    description: 'Cuando te pasaste del límite de una categoría.',
    default: { inApp: true, email: true },
    canDisable: true,
  },
  meta_alcanzada: {
    label: 'Metas alcanzadas',
    description: 'Cuando una meta de ahorro llega al 100%.',
    default: { inApp: true, email: true },
    canDisable: true,
  },
  reporte_mensual: {
    label: 'Reporte mensual',
    description: 'El día 1, cuando hay datos del mes anterior para analizar.',
    default: { inApp: true, email: true },
    canDisable: true,
  },
  resumen_semanal: {
    label: 'Resumen semanal',
    description: 'Los lunes, cuánto gastaste comparado con las 4 semanas anteriores.',
    // Arranca apagado: es el más fácil de percibir como spam y el que menos
    // urgencia tiene. Que lo prenda quien lo quiera.
    default: { inApp: false, email: false },
    canDisable: true,
  },
}

export interface NewNotification {
  userId: string
  type: NotificationType
  title: string
  body?: string | null
  /** Ruta relativa dentro de la app. */
  link?: string | null
  dedupeKey: string
}

/** Lo que devuelve la API del centro de notificaciones. */
export interface NotificationFeed {
  notifications: Notification[]
  unread: number
}
