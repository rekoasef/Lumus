import { SUPPORT_EMAIL } from '@/lib/contact'

/**
 * Quién presta el servicio. Lo exige la Ley 24.240 (y la de comercio
 * electrónico): la persona tiene que saber con quién contrata.
 *
 * Es una persona humana: no hay razón social aparte, la razón social es el
 * nombre. Cuando se inscriba en el monotributo, no hace falta cambiar nada acá.
 */
export const LEGAL_OWNER = {
  name: 'Renzo David Asef',
  cuit: '20-44288970-9',
  address: 'Armstrong, provincia de Santa Fe, Argentina',
  email: SUPPORT_EMAIL,
  site: 'gestorlumus.site',
} as const

/**
 * Versión vigente de los términos y la política de privacidad, que se aceptan
 * juntos. **Cambiarla obliga a todos a aceptar de nuevo** al entrar (el proxy
 * compara contra `legal_acceptances`), así que solo se cambia cuando cambia
 * algo que importa, no por una coma.
 */
export const TERMS_VERSION = '2026-09-17'

/** La fecha de la versión, escrita para mostrar. */
export const TERMS_UPDATED_LABEL = '17 de septiembre de 2026'

/** Plazo del derecho de arrepentimiento (art. 34, Ley 24.240). */
export const WITHDRAWAL_BUSINESS_DAYS = 10

/** Plazo para contestar un pedido de acceso a los datos (art. 14, Ley 25.326). */
export const DATA_ACCESS_DAYS = 10

/** Plazo para borrar o corregir datos (art. 16, Ley 25.326). */
export const DATA_DELETION_BUSINESS_DAYS = 5

/** Cuánto dura el link para confirmar una solicitud de baja o arrepentimiento. */
export const REQUEST_CONFIRM_HOURS = 72

/** Rutas públicas de lo legal. Las usan las páginas, los pies y el proxy. */
export const LEGAL_PATHS = {
  terms: '/terminos',
  privacy: '/privacidad',
  withdrawal: '/arrepentimiento',
  cancellation: '/baja-del-servicio',
  confirm: '/solicitudes/confirmar',
  accept: '/aceptar-terminos',
} as const
