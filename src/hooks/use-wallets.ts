'use client'

import { useState, useCallback } from 'react'
import type { Wallet } from '@/types/finance.types'
import type { CreateWalletInput, UpdateWalletInput } from '@/lib/validations/finance'

export function useWallets(initialWallets: Wallet[]) {
  const [wallets, setWallets] = useState<Wallet[]>(initialWallets)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0)

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

  return {
    wallets,
    totalBalance,
    loading,
    error,
    createWallet,
    updateWallet,
    deleteWallet,
  }
}
