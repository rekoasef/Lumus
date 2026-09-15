import { Activity, CircleDollarSign, KeyRound, Users, type LucideIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import type { AdminKpis as AdminKpisData } from '@/lib/admin/metrics'
import { GRANT_EXPIRY_WARNING_DAYS } from '@/lib/admin/metrics'

interface KpiCard {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  color: string
  warning?: string
}

export function AdminKpis({ kpis, monthlyRevenue }: { kpis: AdminKpisData; monthlyRevenue: number }) {
  const cards: KpiCard[] = [
    {
      label: 'Usuarios',
      value: String(kpis.totalUsers),
      detail: kpis.newThisWeek > 0
        ? `+${kpis.newThisWeek} esta semana`
        : 'Nadie nuevo esta semana',
      icon: Users,
      color: 'var(--accent-lumus)',
    },
    {
      label: 'Activos · 7 días',
      value: `${kpis.active7d}/${kpis.totalUsers}`,
      detail: `${kpis.active30d} en los últimos 30 días`,
      icon: Activity,
      color: 'var(--success)',
    },
    {
      label: 'Acceso',
      value: `${kpis.paying + kpis.courtesy}`,
      detail: `${kpis.paying} pagando · ${kpis.courtesy} cortesía · ${kpis.blocked} bloqueados`,
      icon: KeyRound,
      color: 'var(--info)',
      warning: kpis.grantsExpiringSoon > 0
        ? `${kpis.grantsExpiringSoon} cortesía vence en menos de ${GRANT_EXPIRY_WARNING_DAYS} días`
        : undefined,
    },
    {
      label: 'Ingreso mensual',
      value: formatCurrency(monthlyRevenue),
      detail: kpis.paying === 0 ? 'Todavía nadie paga' : `${kpis.paying} suscripciones activas`,
      icon: CircleDollarSign,
      color: 'var(--warning)',
    },
  ]

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map(({ label, value, detail, icon: Icon, color, warning }) => (
        <div key={label} className="lumus-glass rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <Icon size={15} style={{ color }} />
            <p className="lumus-label text-[0.58rem] text-[var(--text-muted)]">{label}</p>
          </div>
          <p className="mt-3 break-words text-2xl font-bold leading-tight tabular-nums text-[var(--text-primary)]">
            {value}
          </p>
          <p className="mt-1 text-[0.68rem] leading-snug text-[var(--text-muted)]">{detail}</p>
          {warning && (
            <p className="mt-2 text-[0.68rem] font-medium leading-snug text-[var(--warning)]">{warning}</p>
          )}
        </div>
      ))}
    </section>
  )
}
