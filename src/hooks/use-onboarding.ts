'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { localDateStr } from '@/lib/utils/format-date'
import type { WalletPreset } from '@/lib/onboarding/wallet-presets'
import type { FinanceCategory } from '@/types/finance.types'

interface CreatedWallet {
  id: string
  currency: string
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null) as { error?: unknown } | null
  return typeof data?.error === 'string' ? data.error : fallback
}

/**
 * Los tres pasos del onboarding: nombre, primera billetera, primer gasto.
 *
 * El nombre marca el onboarding como hecho **en el primer paso**, a propósito:
 * el proxy manda a `/onboarding` cualquier pedido de quien no lo terminó,
 * incluidas las API. Si se marcara al final, crear la billetera del paso dos
 * rebotaría. Quien abandona después del nombre cae en el panel, donde la lista
 * de primeros pasos le muestra lo que falta.
 */
export function useOnboarding() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async <T,>(task: () => Promise<T>): Promise<T | null> => {
    setBusy(true)
    setError(null)
    try {
      return await task()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal. Probá de nuevo.')
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  const saveName = useCallback((name: string) => run(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Tu sesión se cerró. Volvé a iniciar sesión.')

    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({ user_id: user.id, name: name.trim(), onboarding_done: true }, { onConflict: 'user_id' })
    if (upsertError) throw new Error('No pudimos guardar tu nombre. Probá de nuevo.')
    return true
  }), [run])

  /** Crea la billetera y devuelve las categorías de gasto (se crean con la primera billetera). */
  const createWallet = useCallback((preset: WalletPreset, name: string, balance: number) => run(async () => {
    const res = await fetch('/api/finance/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim() || preset.name,
        type: preset.type,
        currency: preset.currency,
        color: preset.color,
        balance,
      }),
    })
    if (!res.ok) throw new Error(await readError(res, 'No pudimos crear la billetera.'))
    const { wallet } = await res.json() as { wallet: CreatedWallet }

    const catRes = await fetch('/api/finance/categories')
    const { categories } = catRes.ok
      ? await catRes.json() as { categories: FinanceCategory[] }
      : { categories: [] as FinanceCategory[] }

    return { wallet, categories: categories.filter(c => c.type === 'gasto') }
  }), [run])

  const createExpense = useCallback((walletId: string, amount: number, categoryId: string | null, description: string) => run(async () => {
    const res = await fetch('/api/finance/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'gasto',
        wallet_id: walletId,
        category_id: categoryId,
        amount,
        description: description.trim() || null,
        date: localDateStr(),
      }),
    })
    if (!res.ok) throw new Error(await readError(res, 'No pudimos guardar el gasto.'))
    return true
  }), [run])

  return { busy, error, clearError: () => setError(null), saveName, createWallet, createExpense }
}
