import { describe, it, expect } from 'vitest'
import { MAX_REPORT_REGENERATIONS, regenerationState } from './report-limits'

describe('regenerationState', () => {
  it('un reporte recién generado todavía se puede rehacer', () => {
    expect(regenerationState(0)).toEqual({ remaining: MAX_REPORT_REGENERATIONS, canRegenerate: true })
  })

  it('gastado el tope, no se puede rehacer más', () => {
    expect(regenerationState(MAX_REPORT_REGENERATIONS).canRegenerate).toBe(false)
  })

  it('no devuelve restantes negativos si el contador se pasó', () => {
    // Defensivo: si alguna vez se cuentan de más, la UI no puede mostrar "-2".
    expect(regenerationState(99).remaining).toBe(0)
  })
})
