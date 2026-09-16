'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TransactionForm, type TransactionDefaults } from '@/components/modules/finanzas/transaction-form'
import { useTransactions } from '@/hooks/use-transactions'
import type { FinanceCategory, Wallet } from '@/types/finance.types'
import type { CreateTransactionInput } from '@/lib/validations/finance'

/**
 * Cargar un gasto desde cualquier pantalla.
 *
 * El manifest de la PWA ya decía por qué esto importa: *"cada paso entre 'gasté'
 * y 'quedó registrado' es una transacción que no se carga nunca"*. Pero el
 * atajo que se construyó ahí solo aparece manteniendo apretado el ícono de la
 * app instalada. Entrando normal había que pasar por el dashboard, ir a
 * Finanzas y recién ahí buscar el botón.
 *
 * Vive en el layout y no en una página para que el formulario esté a un toque
 * desde donde sea, y se abre de forma imperativa —igual que `confirm()`— para
 * que las dos barras de navegación puedan llamarlo sin pasarse callbacks entre
 * ellas.
 */

let _open: ((defaults?: TransactionDefaults) => void) | null = null

/** Abre el formulario de carga rápida. No hace nada si el provider no está montado. */
export function openQuickExpense(defaults?: TransactionDefaults) {
  _open?.(defaults)
}

interface QuickExpenseProviderProps {
  wallets: Wallet[]
  categories: FinanceCategory[]
  /** Categoría y billetera más usadas — el formulario abre ya lleno. */
  defaults?: TransactionDefaults
}

export function QuickExpenseProvider({ wallets, categories, defaults }: QuickExpenseProviderProps) {
  const [openWith, setOpenWith] = useState<TransactionDefaults | null>(null)
  const router = useRouter()
  const { createTransaction } = useTransactions()

  const open = useCallback((overrides?: TransactionDefaults) => {
    // Sin billeteras el formulario no tiene dónde imputar el gasto. Mejor
    // decirlo que abrir un formulario que no puede guardar.
    if (wallets.length === 0) {
      toast.error('Primero creá una billetera')
      return
    }
    setOpenWith({ type: 'gasto', ...defaults, ...overrides })
  }, [defaults, wallets.length])

  useEffect(() => {
    _open = open
    return () => {
      if (_open === open) _open = null
    }
  }, [open])

  if (!openWith) return null

  async function handleSave(data: CreateTransactionInput) {
    try {
      await createTransaction(data)
    } catch (e) {
      // El formulario queda abierto a propósito: lo escrito sigue ahí. Y el
      // motivo es el del servidor, que es el único que dice qué corregir.
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el movimiento')
      return
    }
    toast.success(data.type === 'ingreso' ? 'Ingreso cargado' : 'Gasto cargado')
    setOpenWith(null)
    // La pantalla de atrás quedó vieja, sea cual sea: saldos, totales del mes o
    // el uso de un presupuesto.
    router.refresh()
  }

  return (
    <TransactionForm
      wallets={wallets}
      categories={categories}
      defaults={openWith}
      onSave={handleSave}
      onClose={() => setOpenWith(null)}
    />
  )
}
