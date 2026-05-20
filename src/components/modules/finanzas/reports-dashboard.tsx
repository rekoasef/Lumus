'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingDown, TrendingUp, Minus, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format-currency'
import type { FinanceReport } from '@/types/finance.types'

export interface CategoryStat {
  id: string
  name: string
  color: string
  amount: number
  pct: number
}

export interface MonthStat {
  label: string
  gastos: number
  ingresos: number
}

interface ReportsDashboardProps {
  expensesByCategory: CategoryStat[]
  monthlyEvolution: MonthStat[]
  currentMonth: { gastos: number; ingresos: number; balance: number }
  monthLabel: string
  aiReports: FinanceReport[]
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'rgba(17, 17, 24, 0.97)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '8px 12px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
}

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return (
        <h3 key={i} className="mb-1 mt-5 text-sm font-semibold text-[var(--text-primary)] first:mt-0">
          {line.slice(3)}
        </h3>
      )
    }
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return (
        <li key={i} className="ml-3 list-none text-sm leading-relaxed text-[var(--text-secondary)] before:mr-1.5 before:content-['·']">
          {line.slice(2)}
        </li>
      )
    }
    if (line.trim() === '') return <div key={i} className="h-1" />
    return <p key={i} className="text-sm leading-relaxed text-[var(--text-secondary)]">{line}</p>
  })
}

function AIReportCard({ report }: { report: FinanceReport }) {
  const [open, setOpen] = useState(false)

  const [y, m] = report.month.split('-').map(Number)
  const monthLabel = new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })
  const createdAt = new Date(report.created_at).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="lumus-glass overflow-hidden rounded-xl">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
            <Sparkles size={13} className="text-[var(--accent-lumus)]" />
          </div>
          <div>
            <p className="text-sm font-medium capitalize text-[var(--text-primary)]">{monthLabel}</p>
            <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">Generado el {createdAt}</p>
          </div>
        </div>
        {open
          ? <ChevronUp size={14} className="flex-shrink-0 text-[var(--text-muted)]" />
          : <ChevronDown size={14} className="flex-shrink-0 text-[var(--text-muted)]" />
        }
      </button>

      {open && (
        <div className="border-t border-white/[0.06] px-5 pb-5 pt-4">
          <div className="space-y-0.5">
            {renderMarkdown(report.content)}
          </div>
        </div>
      )}
    </div>
  )
}

export function ReportsDashboard({
  expensesByCategory,
  monthlyEvolution,
  currentMonth,
  monthLabel,
  aiReports,
}: ReportsDashboardProps) {
  const top5 = expensesByCategory.slice(0, 5)
  const hasExpenses = expensesByCategory.length > 0
  const hasEvolution = monthlyEvolution.some(m => m.gastos > 0 || m.ingresos > 0)
  const balancePositive = currentMonth.balance >= 0

  return (
    <div className="min-h-screen px-5 py-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[1120px]">

        {/* Header */}
        <header className="mb-10">
          <Link
            href="/finanzas"
            className="mb-5 inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          >
            <ArrowLeft size={12} />
            Volver a Finanzas
          </Link>
          <h1 className="lumus-heading text-4xl font-bold text-[var(--text-primary)] md:text-5xl">
            Reportes
          </h1>
          <p className="mt-3 text-base text-[var(--text-secondary)]">
            {monthLabel} · Análisis de tu actividad financiera
          </p>
        </header>

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="lumus-glass rounded-xl p-4">
            <div className="flex items-center gap-2">
              <TrendingDown size={14} className="text-[var(--danger)]" />
              <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">GASTOS DEL MES</p>
            </div>
            <p className="lumus-heading mt-2 text-2xl font-bold text-[var(--danger)]">
              {formatCurrency(currentMonth.gastos)}
            </p>
          </div>
          <div className="lumus-glass rounded-xl p-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-[var(--success)]" />
              <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">INGRESOS DEL MES</p>
            </div>
            <p className="lumus-heading mt-2 text-2xl font-bold text-[var(--success)]">
              {formatCurrency(currentMonth.ingresos)}
            </p>
          </div>
          <div className="lumus-glass rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Minus
                size={14}
                style={{ color: balancePositive ? 'var(--success)' : 'var(--danger)' }}
              />
              <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">BALANCE</p>
            </div>
            <p
              className="lumus-heading mt-2 text-2xl font-bold"
              style={{ color: balancePositive ? 'var(--success)' : 'var(--danger)' }}
            >
              {balancePositive ? '+' : ''}{formatCurrency(currentMonth.balance)}
            </p>
          </div>
        </div>

        {/* Pie chart + Top 5 */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">

          {/* Donut chart */}
          <div className="lumus-glass rounded-2xl p-6">
            <h2 className="lumus-heading mb-1 text-lg font-semibold text-[var(--text-primary)]">
              Gastos por categoría
            </h2>
            <p className="mb-5 text-xs text-[var(--text-muted)]">{monthLabel}</p>

            {!hasExpenses ? (
              <div className="flex h-[240px] items-center justify-center">
                <p className="text-sm text-[var(--text-muted)]">Sin gastos registrados este mes</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="name"
                  >
                    {expensesByCategory.map(entry => (
                      <Cell key={entry.id} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const entry = payload[0]
                      const cat = entry.payload as CategoryStat
                      return (
                        <div style={TOOLTIP_STYLE}>
                          <p style={{ color: cat.color, fontSize: 12, fontWeight: 600 }}>
                            {cat.name}
                          </p>
                          <p style={{ color: '#c8c4d7', fontSize: 11, marginTop: 2 }}>
                            {formatCurrency(cat.amount)} · {cat.pct.toFixed(1)}%
                          </p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top 5 categorías */}
          <div className="lumus-glass rounded-2xl p-6">
            <h2 className="lumus-heading mb-1 text-lg font-semibold text-[var(--text-primary)]">
              Top 5 categorías
            </h2>
            <p className="mb-5 text-xs text-[var(--text-muted)]">{monthLabel}</p>

            {top5.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center">
                <p className="text-sm text-[var(--text-muted)]">Sin gastos registrados este mes</p>
              </div>
            ) : (
              <div className="space-y-5">
                {top5.map((cat, i) => (
                  <div key={cat.id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="lumus-label w-3 text-center text-[0.6rem] text-[var(--text-muted)]">
                          {i + 1}
                        </span>
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm text-[var(--text-secondary)]">{cat.name}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: cat.color }}
                        >
                          {formatCurrency(cat.amount)}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {cat.pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Line chart — evolución 6 meses */}
        <div className="lumus-glass rounded-2xl p-6">
          <h2 className="lumus-heading mb-1 text-lg font-semibold text-[var(--text-primary)]">
            Evolución últimos 6 meses
          </h2>
          <p className="mb-5 text-xs text-[var(--text-muted)]">Gastos vs Ingresos</p>

          <div className="mb-5 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-[3px] w-5 rounded-full bg-[#ef4444]" />
              <span className="text-xs text-[var(--text-muted)]">Gastos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-[3px] w-5 rounded-full bg-[#22c55e]" />
              <span className="text-xs text-[var(--text-muted)]">Ingresos</span>
            </div>
          </div>

          {!hasEvolution ? (
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-sm text-[var(--text-muted)]">Sin movimientos en los últimos 6 meses</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={monthlyEvolution}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#8f8b9e', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#8f8b9e', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v: number) =>
                    v >= 1000000
                      ? `${(v / 1000000).toFixed(1)}M`
                      : v >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : String(v)
                  }
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div style={TOOLTIP_STYLE}>
                        <p style={{ color: '#c8c4d7', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                          {label}
                        </p>
                        {payload.map(p => (
                          <p key={p.name as string} style={{ color: p.color, fontSize: 11, marginTop: 2 }}>
                            {p.name}: {formatCurrency(p.value as number)}
                          </p>
                        ))}
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="gastos"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  name="Gastos"
                />
                <Line
                  type="monotone"
                  dataKey="ingresos"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  name="Ingresos"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Informes IA */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--accent-lumus)]" />
            <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">
              Informes mensuales
            </h2>
            {aiReports.length > 0 && (
              <span className="lumus-label rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[0.58rem] text-[var(--accent-lumus)]">
                {aiReports.length}
              </span>
            )}
          </div>

          {aiReports.length === 0 ? (
            <div className="lumus-glass rounded-2xl py-14 text-center">
              <Sparkles size={22} className="mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">Todavía no generaste ningún informe.</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Volvé al dashboard de Finanzas y usá el banner para generar tu primer informe mensual.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {aiReports.map(r => (
                <AIReportCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
