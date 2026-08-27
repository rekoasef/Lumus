/**
 * Formato de plata, en un solo lugar.
 *
 * Antes de esto había nueve `Intl.NumberFormat` sueltos por los componentes,
 * cada uno con sus propias decisiones de decimales. Las variantes de acá son
 * exactamente esas nueve, nombradas: la idea no es unificar la salida (mostrar
 * un saldo y un movimiento con la misma precisión sería un cambio de producto),
 * sino que la regla viva en un lugar y se elija a propósito.
 */

const LOCALE = 'es-AR'

export type MoneyFormat =
  /** Centavos solo si el monto los tiene. El default: movimientos y totales. */
  | 'auto'
  /** Nunca centavos. Metas, presupuestos y ajustes, donde el centavo es ruido. */
  | 'rounded'
  /** Siempre dos decimales. El saldo de una billetera, que tiene que cuadrar. */
  | 'exact'
  /** Pesos sin centavos, moneda extranjera con centavos. Saldos de resumen. */
  | 'byCurrency'
  /** Notación corta ($ 1,2 M). Solo donde no entra el número entero. */
  | 'compact'

function optionsFor(format: MoneyFormat, currency: string): Intl.NumberFormatOptions {
  switch (format) {
    case 'rounded':
      return { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    case 'exact':
      return { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    case 'byCurrency':
      return currency === 'ARS'
        ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    case 'compact':
      return { notation: 'compact', maximumFractionDigits: 1 }
    case 'auto':
      return { minimumFractionDigits: 0, maximumFractionDigits: 2 }
  }
}

export function formatCurrency(amount: number, currency = 'ARS', format: MoneyFormat = 'auto'): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    ...optionsFor(format, currency),
  }).format(amount)
}
