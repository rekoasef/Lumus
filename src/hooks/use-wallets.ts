'use client'

import { useState, useCallback } from 'react'
import type { Wallet } from '@/types/finance.types'
import type { InvestmentEvent } from '@/lib/finance/investment'
import type { CreateWalletInput, UpdateWalletInput } from '@/lib/validations/finance'

export interface AdjustBalanceInput {
  newBalance: number
  note?: string
  /** Solo en billeteras de inversión: + aporte, − retiro. */
  movement?: number
  /** Cuándo se movió la plata, si no fue hoy. */
  movementDate?: string | null
  /** De dónde salió el aporte o a dónde fue el retiro. */
  counterpartWalletId?: string | null
}

export interface AdjustBalanceResult {
  wallet: Wallet
  /** El aporte y/o el rendimiento que se registraron. Alimentan el historial. */
  events: InvestmentEvent[]
}

/**
 * El resultado de borrar una billetera.
 *
 * Lleva el motivo porque hay un rechazo que el usuario tiene que poder leer:
 * una billetera con un préstamo activo no se puede borrar, y el mensaje dice
 * cuál es el préstamo.
 */
export interface DeleteWalletResult {
  ok: boolean
  error?: string
}

export function useWallets(initialWallets: Wallet[]) {
  const [wallets, setWallets] = useState<Wallet[]>(initialWallets)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0)

  // Suma de balances agrupados por moneda
  const balanceByCurrency = wallets.reduce<Record<string, number>>((acc, w) => {
    const currency = w.currency ?? 'ARS'
    acc[currency] = (acc[currency] ?? 0) + w.balance
    return acc
  }, {})

  const createWallet = useCallback(async (input: CreateWalletInput): Promise<Wallet | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al crear la billetera')
      const { wallet } = await res.json() as { wallet: Wallet }
      setWallets(prev => [...prev, wallet])
      return wallet
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateWallet = useCallback(async (id: string, input: UpdateWalletInput): Promise<Wallet | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/wallets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Error al actualizar la billetera')
      const { wallet } = await res.json() as { wallet: Wallet }
      setWallets(prev => prev.map(w => w.id === id ? wallet : w))
      return wallet
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const adjustBalance = useCallback(async (
    id: string,
    input: AdjustBalanceInput,
  ): Promise<AdjustBalanceResult | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/wallets/${id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_balance: input.newBalance,
          note: input.note || undefined,
          movement: input.movement,
          movement_date: input.movementDate ?? undefined,
          counterpart_wallet_id: input.counterpartWalletId ?? undefined,
        }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => null) as { error?: unknown } | null
        throw new Error(
          typeof detail?.error === 'string' ? detail.error : 'Error al ajustar el balance',
        )
      }
      // Un aporte toca dos billeteras: la inversión y la de donde salió la
      // plata. Las dos vuelven actualizadas para que la pantalla no muestre un
      // saldo viejo del otro lado.
      const { wallet, wallets: touched, events } = await res.json() as {
        wallet: Wallet
        wallets?: Wallet[]
        events: InvestmentEvent[]
      }
      const updated = touched?.length ? touched : [wallet]
      setWallets(prev => prev.map(w => updated.find(u => u.id === w.id) ?? w))
      return { wallet, events: events ?? [] }
    } catch (e) {
      // Se propaga: la pantalla tiene que poder decir *por qué* falló —una fecha
      // futura, un aporte anterior al arranque— en vez de cerrar el diálogo
      // como si hubiera andado.
      setError(e instanceof Error ? e.message : 'Error desconocido')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteWallet = useCallback(async (id: string): Promise<DeleteWalletResult> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/wallets/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        // El mensaje del servidor en vez de uno genérico: cuando la billetera
        // tiene un préstamo activo, ahí está el nombre del préstamo y qué hacer.
        const body = await res.json().catch(() => null) as { error?: unknown } | null
        throw new Error(
          typeof body?.error === 'string' ? body.error : 'Error al eliminar la billetera',
        )
      }
      setWallets(prev => prev.filter(w => w.id !== id))
      return { ok: true }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error desconocido'
      setError(message)
      return { ok: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [])

  const localUpdateBalance = useCallback((id: string, delta: number) => {
    setWallets(prev => prev.map(w => w.id === id ? { ...w, balance: w.balance + delta } : w))
  }, [])

  const setWalletBalance = useCallback((id: string, balance: number) => {
    setWallets(prev => prev.map(w => w.id === id ? { ...w, balance } : w))
  }, [])

  return {
    wallets,
    totalBalance,
    balanceByCurrency,
    loading,
    error,
    createWallet,
    updateWallet,
    adjustBalance,
    deleteWallet,
    localUpdateBalance,
    setWalletBalance,
  }
}
