import { describe, it, expect } from 'vitest'
import {
  movementsOf,
  yieldTimeline,
  investedCapital,
  investmentReturn,
  investmentReturnUsd,
  splitBalanceChange,
  isNegligible,
} from './investment'

describe('investedCapital', () => {
  it('sin movimientos, el capital es la base', () => {
    expect(investedCapital(2_928_679, [])).toBe(2_928_679)
  })

  it('suma aportes y resta retiros', () => {
    const capital = investedCapital(100_000, [
      { date: '2026-07-01', amount: 50_000 },
      { date: '2026-08-01', amount: -20_000 },
    ])
    expect(capital).toBe(130_000)
  })
})

describe('investmentReturn', () => {
  it('un saldo que creció sin aportes es todo rendimiento', () => {
    const r = investmentReturn(110_000, 100_000, [])
    expect(r.investedArs).toBe(100_000)
    expect(r.returnArs).toBe(10_000)
    expect(r.percent).toBeCloseTo(10)
  })

  it('el aporte no cuenta como rendimiento — es el bug que motivó todo esto', () => {
    // Puso 50.000 y el saldo subió exactamente 50.000: no ganó nada.
    const r = investmentReturn(150_000, 100_000, [{ date: '2026-08-01', amount: 50_000 }])
    expect(r.investedArs).toBe(150_000)
    expect(r.returnArs).toBe(0)
    expect(r.percent).toBe(0)
  })

  it('una pérdida da rendimiento negativo', () => {
    const r = investmentReturn(90_000, 100_000, [])
    expect(r.returnArs).toBe(-10_000)
    expect(r.percent).toBeCloseTo(-10)
  })

  it('un retiro no se confunde con una pérdida', () => {
    const r = investmentReturn(80_000, 100_000, [{ date: '2026-08-01', amount: -20_000 }])
    expect(r.investedArs).toBe(80_000)
    expect(r.returnArs).toBe(0)
  })

  it('sin capital no inventa un porcentaje', () => {
    expect(investmentReturn(0, 0, []).percent).toBeNull()
  })
})

describe('investmentReturnUsd', () => {
  const rates = [
    { date: '2026-08-28', usd: 1_538 },
    { date: '2026-08-01', usd: 1_400 },
    { date: '2026-01-01', usd: 1_000 },
  ]

  it('ganar en pesos puede ser perder en dólares', () => {
    // 1.000.000 puestos con el dólar a 1.000 = 1.000 USD.
    // Hoy vale 1.200.000 (+20% en pesos) pero el dólar está a 1.538: 780 USD.
    const r = investmentReturnUsd(1_200_000, 1_000_000, '2026-01-01', [], rates, '2026-08-28')
    expect(r).not.toBeNull()
    expect(r!.investedUsd).toBeCloseTo(1_000)
    expect(r!.balanceUsd).toBeCloseTo(780.23, 1)
    expect(r!.returnUsd).toBeLessThan(0)
    expect(r!.percent).toBeLessThan(0)
  })

  it('valúa cada aporte con la cotización de su día', () => {
    const r = investmentReturnUsd(
      1_538_000,
      1_000_000,
      '2026-01-01',
      [{ date: '2026-08-01', amount: 140_000 }],
      rates,
      '2026-08-28',
    )
    // 1000 USD de la base + 100 USD del aporte de agosto.
    expect(r!.investedUsd).toBeCloseTo(1_100)
    expect(r!.balanceUsd).toBeCloseTo(1_000)
    expect(r!.returnUsd).toBeCloseTo(-100)
  })

  it('usa la cotización anterior más cercana cuando el día no tiene', () => {
    // Un domingo no cotiza: tiene que tomar el viernes, no fallar.
    const r = investmentReturnUsd(1_000_000, 1_000_000, '2026-08-03', [], rates, '2026-08-28')
    expect(r).not.toBeNull()
    expect(r!.investedUsd).toBeCloseTo(714.29, 1)
  })

  it('devuelve null si falta la cotización de un aporte en vez de inventarla', () => {
    const r = investmentReturnUsd(
      1_000_000,
      500_000,
      '2026-01-01',
      [{ date: '2011-05-04', amount: 100 }],
      rates,
      '2026-08-28',
    )
    expect(r).toBeNull()
  })

  it('devuelve null si no hay cotización de hoy', () => {
    expect(investmentReturnUsd(1_000, 1_000, '2026-01-01', [], [], '2026-08-28')).toBeNull()
  })
})

describe('splitBalanceChange', () => {
  it('sin movimiento, todo el cambio es rendimiento', () => {
    expect(splitBalanceChange(100_000, 105_000, 0)).toEqual({ movement: 0, yield: 5_000 })
  })

  it('un aporte igual al cambio no deja rendimiento', () => {
    expect(splitBalanceChange(100_000, 150_000, 50_000)).toEqual({ movement: 50_000, yield: 0 })
  })

  it('reparte aporte y rendimiento en la misma actualización', () => {
    // El caso real del 2026-06-19: entraron 252.222 y solo 250.000 eran plata
    // que salió de Mercado Pago.
    const split = splitBalanceChange(0, 252_222, 250_000)
    expect(split.movement).toBe(250_000)
    expect(split.yield).toBe(2_222)
  })

  it('un retiro con pérdida da las dos cosas negativas', () => {
    const split = splitBalanceChange(100_000, 70_000, -20_000)
    expect(split.movement).toBe(-20_000)
    expect(split.yield).toBe(-10_000)
  })

  it('retirar más que la caída del saldo significa que además rindió', () => {
    const split = splitBalanceChange(100_000, 85_000, -20_000)
    expect(split.yield).toBe(5_000)
  })
})

describe('isNegligible', () => {
  it('los centavos de redondeo no son un movimiento', () => {
    expect(isNegligible(0.004)).toBe(true)
    expect(isNegligible(-0.004)).toBe(true)
    expect(isNegligible(1)).toBe(false)
  })
})

describe('movementsOf', () => {
  it('deja afuera los rendimientos: no son capital que hayas puesto', () => {
    const movements = movementsOf([
      { date: '2026-08-01', amount: 50_000, kind: 'movimiento' },
      { date: '2026-08-15', amount: 3_000,  kind: 'rendimiento' },
      { date: '2026-08-20', amount: -10_000, kind: 'movimiento' },
    ])
    expect(movements).toEqual([
      { date: '2026-08-01', amount: 50_000 },
      { date: '2026-08-20', amount: -10_000 },
    ])
  })
})

describe('yieldTimeline', () => {
  it('acumula los rendimientos en orden cronológico', () => {
    const timeline = yieldTimeline([
      { date: '2026-08-20', amount: 2_000, kind: 'rendimiento' },
      { date: '2026-08-01', amount: 5_000, kind: 'rendimiento' },
      { date: '2026-08-10', amount: 1_000, kind: 'rendimiento' },
    ])
    expect(timeline.map(p => p.accumulated)).toEqual([5_000, 6_000, 8_000])
    expect(timeline[0].date).toBe('2026-08-01')
  })

  it('suma en un punto los rendimientos del mismo día', () => {
    const timeline = yieldTimeline([
      { date: '2026-08-01', amount: 1_000, kind: 'rendimiento' },
      { date: '2026-08-01', amount: 500,   kind: 'rendimiento' },
    ])
    expect(timeline).toHaveLength(1)
    expect(timeline[0].amount).toBe(1_500)
  })

  it('una pérdida baja el acumulado', () => {
    const timeline = yieldTimeline([
      { date: '2026-08-01', amount: 10_000, kind: 'rendimiento' },
      { date: '2026-08-15', amount: -4_000, kind: 'rendimiento' },
    ])
    expect(timeline[1].accumulated).toBe(6_000)
  })

  it('ignora los aportes: no son rendimiento', () => {
    const timeline = yieldTimeline([
      { date: '2026-08-01', amount: 250_000, kind: 'movimiento' },
    ])
    expect(timeline).toEqual([])
  })
})
