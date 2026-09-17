/**
 * Las billeteras que se ofrecen en el onboarding.
 *
 * Son las cuatro que casi todos tienen en Argentina. Elegir una tarjeta es más
 * rápido que un formulario con tipo, moneda y color, y el nombre se puede
 * cambiar ahí mismo.
 */

export type WalletPresetId = 'efectivo' | 'banco' | 'mercadopago' | 'dolares'

export interface WalletPreset {
  id: WalletPresetId
  label: string
  hint: string
  /** Lo que se guarda: `type`, `currency` y `color` del esquema de billeteras. */
  name: string
  type: 'efectivo' | 'banco' | 'virtual'
  currency: 'ARS' | 'USD'
  color: string
}

export const WALLET_PRESETS: readonly WalletPreset[] = [
  { id: 'efectivo', label: 'Efectivo', hint: 'La billetera del bolsillo', name: 'Efectivo', type: 'efectivo', currency: 'ARS', color: '#22c55e' },
  { id: 'banco', label: 'Cuenta bancaria', hint: 'Sueldo, débito, transferencias', name: 'Banco', type: 'banco', currency: 'ARS', color: '#3b82f6' },
  { id: 'mercadopago', label: 'Mercado Pago', hint: 'O cualquier billetera virtual', name: 'Mercado Pago', type: 'virtual', currency: 'ARS', color: '#06b6d4' },
  { id: 'dolares', label: 'Dólares', hint: 'Ahorro en billetes o cuenta en USD', name: 'Dólares', type: 'efectivo', currency: 'USD', color: '#eab308' },
]

/**
 * El monto que escribe la persona, a número. Acepta "150.000", "150000,50" y
 * "150000.5": en Argentina el punto es de miles y la coma de decimales, pero
 * el teclado numérico del celular a veces solo ofrece el punto.
 */
export function parseAmountInput(raw: string): number | null {
  const value = raw.trim().replace(/\s/g, '')
  if (!value) return null

  let normalized: string
  if (value.includes(',')) {
    // Coma decimal: los puntos son de miles.
    normalized = value.replace(/\./g, '').replace(',', '.')
  } else {
    const parts = value.split('.')
    // Un solo punto seguido de 1 o 2 dígitos es decimal; si no, son miles.
    normalized = parts.length === 2 && parts[1].length <= 2 ? value : value.replace(/\./g, '')
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}
