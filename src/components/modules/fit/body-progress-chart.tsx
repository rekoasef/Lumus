'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { BodyRecord } from '@/types/fit.types'

const TOOLTIP_STYLE = {
  backgroundColor: '#1a1a26',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10,
  color: 'var(--text-primary)',
  fontSize: 12,
}

interface BodyProgressChartProps {
  records: BodyRecord[]
  latestWeight: number | null
  weightTrend: 'up' | 'down' | 'stable'
}

export function BodyProgressChart({ records, latestWeight, weightTrend }: BodyProgressChartProps) {
  const chartData = records
    .filter(r => r.weight_kg != null)
    .slice(0, 30)
    .reverse()
    .map(r => ({
      date: new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
      peso: r.weight_kg as number,
    }))

  const trendIcon = { up: '↑', down: '↓', stable: '→' }[weightTrend]
  const trendColor = { up: '#f97316', down: '#22d3ee', stable: 'var(--text-muted)' }[weightTrend]

  if (chartData.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-[var(--text-muted)]">Sin registros de peso todavía</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]/60">Agregá tu primer registro arriba</p>
      </div>
    )
  }

  return (
    <div>
      {latestWeight != null && (
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[var(--text-primary)]">{latestWeight} kg</span>
          <span className="text-sm font-medium" style={{ color: trendColor }}>
            {trendIcon}
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}kg`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => [`${v ?? '—'} kg`, 'Peso']}
          />
          <Line
            type="monotone"
            dataKey="peso"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={chartData.length <= 10}
            activeDot={{ r: 4, fill: '#22d3ee' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
