import { describe, it, expect } from 'vitest'
import {
  activationFunnel,
  adminKpis,
  engagementLevel,
  featureAdoption,
  rankByUsage,
  toUserRow,
  usageRatio,
} from './metrics'
import type { AdminUserStats } from '@/types/admin.types'

const NOW = new Date('2026-09-15T12:00:00Z')

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

function stats(overrides: Partial<AdminUserStats> = {}): AdminUserStats {
  return {
    userId: 'u1',
    email: 'u1@ejemplo.com',
    name: null,
    createdAt: daysAgo(60),
    emailConfirmedAt: daysAgo(60),
    lastSignInAt: null,
    onboardingDone: true,
    subscriptionStatus: null,
    subscriptionPaidUntil: null,
    hasGrant: true,
    grantReason: 'beta tester',
    grantExpiresAt: null,
    wallets: 1,
    transactions: 10,
    transactions30d: 0,
    activeDays30d: 0,
    lastTransactionAt: null,
    budgets: 0,
    recurring: 0,
    goals: 0,
    loans: 0,
    holdings: 0,
    reports: 0,
    wealthAnalyses: 0,
    feedback: 0,
    ...overrides,
  }
}

describe('engagementLevel', () => {
  it('clasifica por días desde lo último que hizo', () => {
    expect(engagementLevel(daysAgo(0), NOW)).toBe('activo')
    expect(engagementLevel(daysAgo(7), NOW)).toBe('activo')
    expect(engagementLevel(daysAgo(8), NOW)).toBe('tibio')
    expect(engagementLevel(daysAgo(30), NOW)).toBe('tibio')
    expect(engagementLevel(daysAgo(31), NOW)).toBe('inactivo')
    expect(engagementLevel(null, NOW)).toBe('nunca')
  })
})

describe('toUserRow', () => {
  it('lo último visto es lo más reciente entre loguearse y cargar un movimiento', () => {
    // El caso real del primer tester: último login el 31/08, pero cargó ayer.
    // Mirando solo el login figuraría inactivo.
    const row = toUserRow(stats({ lastSignInAt: daysAgo(15), lastTransactionAt: daysAgo(1) }), NOW)
    expect(row.lastSeenAt).toBe(daysAgo(1))
    expect(row.engagement).toBe('activo')
  })

  it('aplica la misma regla de acceso que el gate', () => {
    expect(toUserRow(stats({ hasGrant: true, grantExpiresAt: daysAgo(1) }), NOW).access).toBe('none')
    expect(toUserRow(stats({ hasGrant: false, subscriptionStatus: 'authorized' }), NOW).access).toBe('subscription')
  })
})

describe('activationFunnel', () => {
  it('es acumulativo: cada paso cuenta solo a quien pasó los anteriores', () => {
    const rows = [
      // Completo y activo
      stats({ userId: 'a', lastTransactionAt: daysAgo(1) }),
      // Tiene billetera y movimientos, pero el acceso se le venció
      stats({ userId: 'b', grantExpiresAt: daysAgo(3) }),
      // Se registró y nunca verificó el mail
      stats({ userId: 'c', emailConfirmedAt: null, onboardingDone: false, hasGrant: false, wallets: 0, transactions: 0 }),
    ].map(s => toUserRow(s, NOW))

    const counts = Object.fromEntries(activationFunnel(rows).map(s => [s.key, s.count]))
    expect(counts).toEqual({
      registered: 3,
      verified: 2,
      onboarding: 2,
      access: 1,
      // `b` tiene billetera, pero ya cayó en "acceso": no puede reaparecer acá
      wallet: 1,
      transaction: 1,
      active: 1,
    })
  })
})

describe('featureAdoption', () => {
  it('cuenta sobre quienes ya cargaron algo, y ordena de más a menos usada', () => {
    const rows = [
      stats({ userId: 'a', budgets: 2, loans: 1 }),
      stats({ userId: 'b', budgets: 1 }),
      // Sin movimientos: no entra en la base aunque tenga una meta
      stats({ userId: 'c', transactions: 0, goals: 1 }),
    ].map(s => toUserRow(s, NOW))

    const { base, features } = featureAdoption(rows)
    expect(base).toBe(2)
    expect(features[0]).toEqual({ key: 'budgets', label: 'Presupuestos', users: 2 })
    expect(features.find(f => f.key === 'loans')?.users).toBe(1)
    expect(features.find(f => f.key === 'goals')?.users).toBe(0)
  })
})

describe('rankByUsage', () => {
  it('ordena por días activos antes que por cantidad cargada', () => {
    const rows = [
      stats({ userId: 'atracon', activeDays30d: 1, transactions30d: 40 }),
      stats({ userId: 'habito', activeDays30d: 18, transactions30d: 25 }),
      stats({ userId: 'empate', activeDays30d: 1, transactions30d: 50 }),
    ].map(s => toUserRow(s, NOW))

    expect(rankByUsage(rows).map(r => r.userId)).toEqual(['habito', 'empate', 'atracon'])
  })

  it('no muta el arreglo recibido', () => {
    const rows = [stats({ userId: 'x' }), stats({ userId: 'y', activeDays30d: 3 })].map(s => toUserRow(s, NOW))
    rankByUsage(rows)
    expect(rows.map(r => r.userId)).toEqual(['x', 'y'])
  })
})

describe('adminKpis', () => {
  it('separa pagando, cortesía y bloqueados, y marca los grants por vencer', () => {
    const inDays = (d: number) => new Date(NOW.getTime() + d * 24 * 60 * 60 * 1000).toISOString()
    const rows = [
      stats({ userId: 'paga', hasGrant: false, subscriptionStatus: 'authorized', lastSignInAt: daysAgo(2) }),
      stats({ userId: 'vence', grantExpiresAt: inDays(10), lastSignInAt: daysAgo(20) }),
      stats({ userId: 'lejos', grantExpiresAt: inDays(60), createdAt: daysAgo(2), lastSignInAt: daysAgo(2) }),
      stats({ userId: 'bloqueado', hasGrant: false, lastSignInAt: daysAgo(90) }),
    ].map(s => toUserRow(s, NOW))

    expect(adminKpis(rows, NOW)).toEqual({
      totalUsers: 4,
      active7d: 2,
      active30d: 3,
      newThisWeek: 1,
      paying: 1,
      courtesy: 2,
      blocked: 1,
      grantsExpiringSoon: 1,
    })
  })
})

describe('usageRatio', () => {
  it('queda acotado entre 0 y 1', () => {
    expect(usageRatio(50, 100)).toBe(0.5)
    expect(usageRatio(150, 100)).toBe(1)
    expect(usageRatio(-5, 100)).toBe(0)
    expect(usageRatio(5, 0)).toBe(0)
  })
})
