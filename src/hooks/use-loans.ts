'use client'

import { useCallback, useState } from 'react'
import type { Loan, LoanRepayment } from '@/lib/finance/loans'
import type { CreateLoanInput, LoanRepaymentInput, UpdateLoanInput } from '@/lib/validations/finance'
import type { Wallet } from '@/types/finance.types'

type WalletBalance = Pick<Wallet, 'id' | 'balance'>

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
      const { loan } = await res.json() as { loan: Loan }
      setLoans(prev => prev.map(l => (l.id === id ? loan : l)))
      return loan
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteLoan = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/loans/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await readError(res, 'No se pudo eliminar el préstamo'))
      setLoans(prev => prev.filter(l => l.id !== id))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

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

  return { loans, repayments, loading, error, refresh, createLoan, updateLoan, deleteLoan, registerRepayment }
}
