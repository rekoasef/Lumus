/**
 * Cuántas veces se puede rehacer un reporte mensual.
 *
 * El reporte es la única llamada paga que hace Lumus, y el botón "Regenerar"
 * no tenía tope: cada click era una llamada a la API. Con 150-300 reportes por
 * mes, esto es la diferencia entre un costo que se puede predecir y uno que
 * depende de las ganas que tenga alguien de apretar un botón.
 *
 * Uno y no cero porque la primera respuesta puede salir floja y pedir otra es
 * razonable. Uno y no tres porque a la tercera ya no estás buscando un reporte
 * mejor, estás jugando a la ruleta.
 */
export const MAX_REPORT_REGENERATIONS = 1

export interface RegenerationState {
  /** Cuántas quedan. Nunca negativo. */
  remaining: number
  canRegenerate: boolean
}

export function regenerationState(used: number): RegenerationState {
  const remaining = Math.max(MAX_REPORT_REGENERATIONS - used, 0)
  return { remaining, canRegenerate: remaining > 0 }
}
