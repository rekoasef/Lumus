'use client'

import { useCallback, useState } from 'react'
import type { Loan, LoanRepayment } from '@/lib/finance/loans'
import type { CreateLoanInput, LoanRepaymentInput, UpdateLoanInput } from '@/lib/validations/finance'
import type { Wallet } from '@/types/finance.types'

type WalletBalance = Pick<Wallet, 'id' | 'balance'>

/**
 * El resultado de archivar o eliminar.
 *
 * Lleva el motivo y no solo un booleano porque la API rechaza archivar un
 * préstamo con pendiente, y ese mensaje explica qué hacer en su lugar.
 */
export interface LoanRemovalResult {
  ok: boolean
  error?: string
}

interface UseLoansCallbacks {
  /** Un préstamo mueve plata: el saldo de la billetera cambió. */
  onWalletBalance?: (wallets: WalletBalance[]) => void
}

/**
 * Alta, edición, baja y pagos de préstamos.
 *
 * Las devoluciones se guardan acá junto a los préstamos porque **cuánto se debe
 * no se puede saber sin ellas**: el pendiente sale de `loanProgress`, que
 * necesita las dos cosas. Tenerlas en estados separados es la forma de que una
 * pantalla muestre una deuda vieja.
 */
export function useLoans(
  initialLoans: Loan[],
  initialRepayments: Record<string, LoanRepayment[]>,
  callbacks?: UseLoansCallbacks,
) {
  const [loans, setLoans] = useState<Loan[]>(initialLoans)
  const [repayments, setRepayments] = useState<Record<string, LoanRepayment[]>>(initialRepayments)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onWalletBalance = callbacks?.onWalletBalance

  async function readError(res: Response, fallback: string): Promise<string> {
    const body = await res.json().catch(() => null) as { error?: unknown } | null
    return typeof body?.error === 'string' ? body.error : fallback
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/loans')
      if (!res.ok) throw new Error('No se pudieron cargar los préstamos')
      const data = await res.json() as { loans: Loan[]; repayments: Record<string, LoanRepayment[]> }
      setLoans(data.loans)
      setRepayments(data.repayments)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const createLoan = useCallback(async (input: CreateLoanInput): Promise<Loan | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await readError(res, 'No se pudo crear el préstamo'))
      const { loan, wallet } = await res.json() as { loan: Loan; wallet?: WalletBalance }
      setLoans(prev => [loan, ...prev])
      setRepayments(prev => ({ ...prev, [loan.id]: [] }))
      if (wallet) onWalletBalance?.([wallet])
      return loan
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [onWalletBalance])

  const updateLoan = useCallback(async (id: string, input: UpdateLoanInput): Promise<Loan | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/loans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await readError(res, 'No se pudo actualizar el préstamo'))
      // Editar el capital o la billetera mueve el desembolso, así que el saldo
      // puede haber cambiado: viene en la respuesta para no recargar.
      const { loan, wallets } = await res.json() as { loan: Loan; wallets?: WalletBalance[] }
      setLoans(prev => prev.map(l => (l.id === id ? loan : l)))
      if (wallets?.length) onWalletBalance?.(wallets)
      return loan
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [onWalletBalance])

  /**
   * Sacar un préstamo de la pantalla, de las dos formas que existen.
   *
   * `archivar` es "esto terminó" y deja los movimientos donde están — la API lo
   * permite solo si está saldado. Sin `archivar` es "esto nunca pasó" y se
   * lleva el desembolso y cada cuota.
   *
   * Devuelve las billeteras porque en el segundo caso los saldos vuelven a
   * donde estaban, y si la pantalla no se entera queda mostrando plata que ya
   * no existe. Al archivar vuelve vacío: no se movió un peso.
   */
  const removeLoan = useCallback(async (
    id: string,
    mode: 'eliminar' | 'archivar' = 'eliminar',
  ): Promise<LoanRemovalResult> => {
    setLoading(true)
    setError(null)
    try {
      const url = mode === 'archivar'
        ? `/api/finance/loans/${id}?modo=archivar`
        : `/api/finance/loans/${id}`
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error(await readError(
          res,
          mode === 'archivar' ? 'No se pudo archivar el préstamo' : 'No se pudo eliminar el préstamo',
        ))
      }
      const { wallets } = await res.json() as { wallets?: WalletBalance[] }

      setLoans(prev => prev.filter(l => l.id !== id))
      setRepayments(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      if (wallets?.length) onWalletBalance?.(wallets)
      return { ok: true }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error desconocido'
      setError(message)
      return { ok: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [onWalletBalance])

  /** Registrar una cuota pagada (tomado) o un cobro recibido (otorgado). */
  const registerRepayment = useCallback(async (id: string, input: LoanRepaymentInput): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/loans/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await readError(res, 'No se pudo registrar el pago'))
      const { loan, repayment, wallet } = await res.json() as {
        loan: Loan
        repayment: LoanRepayment
        wallet?: WalletBalance
      }
      setLoans(prev => prev.map(l => (l.id === id ? loan : l)))
      setRepayments(prev => ({ ...prev, [id]: [...(prev[id] ?? []), repayment] }))
      if (wallet) onWalletBalance?.([wallet])
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [onWalletBalance])

  return { loans, repayments, loading, error, refresh, createLoan, updateLoan, removeLoan, registerRepayment }
}
