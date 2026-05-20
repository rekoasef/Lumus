'use client'

import { useState, useCallback } from 'react'
import type { Wallet } from '@/types/finance.types'
import type { CreateWalletInput, UpdateWalletInput } from '@/lib/validations/finance'

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

  const adjustBalance = useCallback(async (id: string, newBalance: number, note: string): Promise<Wallet | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/wallets/${id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_balance: newBalance, note: note || undefined }),
      })
      if (!res.ok) throw new Error('Error al ajustar el balance')
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

  const deleteWallet = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/wallets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar la billetera')
      setWallets(prev => prev.filter(w => w.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const localUpdateBalance = useCallback((id: string, delta: number) => {
    setWallets(prev => prev.map(w => w.id === id ? { ...w, balance: w.balance + delta } : w))
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
  }
}
