'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp } from 'lucide-react'

interface DolarRate {
  casa: string
  nombre: string
  compra: number | null
  venta: number | null
  fechaActualizacion: string
}

interface EuroRate {
  moneda: string
  nombre: string
  compra: number | null
  venta: number | null
  fechaActualizacion: string
}

interface Currency {
  label: string
  venta: number | null
  color: string
}

function fmt(n: number | null): string {
  if (n === null) return '--'
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

export function CurrencyWidget() {
  const [currencies, setCurrencies] = useState<Currency[] | null>(null)

  const load = useCallback(async () => {
    try {
      const [dolarRes, euroRes] = await Promise.allSettled([
        fetch('https://dolarapi.com/v1/dolares').then(r => r.json() as Promise<DolarRate[]>),
        fetch('https://dolarapi.com/v1/cotizaciones/eur').then(r => r.json() as Promise<EuroRate>),
      ])

      const items: Currency[] = []

      if (dolarRes.status === 'fulfilled') {
        const rates = dolarRes.value
        const oficial = rates.find(r => r.casa === 'oficial')
        const blue = rates.find(r => r.casa === 'blue')
        const bolsa = rates.find(r => r.casa === 'bolsa')

        if (oficial) items.push({ label: 'Oficial', venta: oficial.venta, color: '#22c55e' })
        if (blue) items.push({ label: 'Blue', venta: blue.venta, color: '#7c6dfa' })
        if (bolsa) items.push({ label: 'MEP', venta: bolsa.venta, color: '#06b6d4' })
      }

      if (euroRes.status === 'fulfilled') {
        items.push({ label: 'EUR', venta: euroRes.value.venta, color: '#f59e0b' })
      }

      if (items.length > 0) setCurrencies(items)
    } catch {
      // silently fail — widget just stays empty
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  if (!currencies) {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-white/5" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 mr-1">
        <TrendingUp size={12} className="text-[var(--text-muted)]" />
        <span className="text-[0.6rem] uppercase tracking-wider text-[var(--text-muted)]">Cotizaciones</span>
      </div>
      {currencies.map(c => (
        <div
          key={c.label}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{
            background: `${c.color}14`,
            border: `1px solid ${c.color}30`,
          }}
        >
          <span className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: c.color }}>
            {c.label}
          </span>
          <span className="text-xs font-bold text-[var(--text-primary)]">
            ${fmt(c.venta)}
          </span>
        </div>
      ))}
    </div>
  )
}
